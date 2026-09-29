#!/usr/bin/env bash
# Mirror a committed static export while preserving the destination's Git history.
# Authentication is supplied by the caller (for example through GIT_ASKPASS).
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 SOURCE_DIRECTORY DESTINATION_URL [BRANCH]" >&2
  exit 2
fi

source_dir="$(cd "$1" && pwd -P)"
destination_url="$2"
branch="${3:-main}"
git check-ref-format --branch "$branch" >/dev/null
source_sha="$(git -C "$source_dir" rev-parse --verify 'HEAD^{commit}')"
source_dir="$(git -C "$source_dir" rev-parse --show-toplevel)"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
snapshot_dir="$work_dir/snapshot"
mirror_dir="$work_dir/mirror"
mkdir "$snapshot_dir"

# Archive only tracked, committed bytes: never publish runner files or credentials.
git -C "$source_dir" archive --format=tar "$source_sha" | tar -xf - -C "$snapshot_dir"
if [[ ! -s "$snapshot_dir/index.html" ]]; then
  echo "Refusing to mirror an export without a nonempty index.html" >&2
  exit 1
fi

# Cloning also selects the destination's object format (GitLab currently uses SHA-256).
# Never initialize unrelated history or force-push over a protected branch.
git clone --quiet --no-tags --single-branch --branch "$branch" -- \
  "$destination_url" "$mirror_dir"
git -C "$mirror_dir" config user.name 'github-actions[bot]'
git -C "$mirror_dir" config user.email '41898282+github-actions[bot]@users.noreply.github.com'

report() {
  local destination_sha="$1" changed="$2"
  echo "GitHub source: $source_sha"
  echo "GitLab destination: $destination_sha"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf 'source_sha=%s\ndestination_sha=%s\nchanged=%s\n' \
      "$source_sha" "$destination_sha" "$changed" >> "$GITHUB_OUTPUT"
  fi
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      printf '### GitLab Pages repository sync\n\n'
      printf -- '- GitHub source: `%s`\n' "$source_sha"
      printf -- '- GitLab commit: `%s`\n' "$destination_sha"
      printf -- '- New commit: `%s`\n' "$changed"
      printf '\nNormal fast-forward push; branch protection and history preserved.\n'
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

for attempt in 1 2 3; do
  # A concurrent destination update is retained as history before reapplying the snapshot.
  git -C "$mirror_dir" fetch --quiet --no-tags origin "refs/heads/$branch"
  git -C "$mirror_dir" reset --hard --quiet FETCH_HEAD
  git -C "$mirror_dir" clean -fdx --quiet
  rsync -a --delete --exclude='/.git/' "$snapshot_dir/" "$mirror_dir/"
  # Exported paths are already tracked upstream, including any now ignored by .gitignore.
  git -C "$mirror_dir" add --all --force -- .

  changed=false
  if ! git -C "$mirror_dir" diff --cached --quiet; then
    git -C "$mirror_dir" commit --quiet -m "Mirror GitHub Pages $source_sha"
    changed=true
    if ! git -C "$mirror_dir" push origin "HEAD:refs/heads/$branch"; then
      echo "Mirror push attempt $attempt failed; refreshing destination history" >&2
      continue
    fi
  else
    echo "GitLab already matches the committed GitHub snapshot"
  fi

  destination_sha="$(git -C "$mirror_dir" rev-parse HEAD)"
  remote_sha="$(git -C "$mirror_dir" ls-remote origin "refs/heads/$branch" | cut -f1)"
  if [[ "$remote_sha" == "$destination_sha" ]]; then
    report "$destination_sha" "$changed"
    exit 0
  fi
  echo "Destination advanced during verification; retrying snapshot sync" >&2
done

echo "GitLab mirror failed after 3 attempts; no force push was attempted" >&2
exit 1
