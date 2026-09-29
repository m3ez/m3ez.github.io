import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = join(root, 'automation/mirror-gitlab-pages.sh');
const workflow = join(root, '.github/workflows/mirror-gitlab.yml');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, ...options,
  });
  assert.ifError(result.error);
  return result;
}

function git(cwd, ...args) {
  const result = run('git', ['-C', cwd, ...args]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function put(dir, path, content) {
  const target = join(dir, path);
  mkdirSync(resolve(target, '..'), { recursive: true });
  writeFileSync(target, content);
}

function commit(dir, message) {
  git(dir, 'add', '--all', '--force', '--', '.');
  git(dir, 'commit', '--quiet', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'gitlab-mirror-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source');
  const seed = join(dir, 'seed');
  const remote = join(dir, 'destination.git');
  for (const [path, format] of [[source, 'sha1'], [seed, 'sha256']]) {
    mkdirSync(path);
    git(path, 'init', '--quiet', `--object-format=${format}`, '-b', 'main');
    git(path, 'config', 'user.name', 'Mirror Test');
    git(path, 'config', 'user.email', 'mirror-test@example.invalid');
  }
  put(source, 'index.html', '<h1>current portfolio</h1>\n');
  put(source, 'assets/theme.css', 'body { color: black; }\n');
  put(source, '.nojekyll', '\n');
  put(source, '.gitignore', 'ignored-but-tracked.txt\n');
  put(source, 'ignored-but-tracked.txt', 'must be mirrored\n');
  put(source, 'asset.bin', Buffer.from([0, 255, 42, 128, 10]));
  const sourceSha = commit(source, 'initial source');
  put(source, 'untracked-secret.txt', 'never publish untracked files\n');
  put(seed, 'index.html', '<h1>old portfolio</h1>\n');
  put(seed, 'obsolete.css', 'remove me\n');
  const initial = commit(seed, 'existing GitLab history');
  const result = run('git', ['clone', '--quiet', '--bare', seed, remote]);
  assert.equal(result.status, 0, result.stderr);
  git(remote, 'config', 'receive.denyNonFastForwards', 'true');
  return { dir, source, remote, sourceSha, initial };
}

function mirror(f, branch = 'main') {
  return run('bash', [script, f.source, f.remote, branch], {
    env: {
      ...process.env, GIT_TERMINAL_PROMPT: '0',
      GITHUB_SHA: 'incorrect-event-sha',
      GITHUB_OUTPUT: join(f.dir, 'output'),
      GITHUB_STEP_SUMMARY: join(f.dir, 'summary'),
    },
  });
}

function assertSameFiles(source, destination) {
  const paths = git(source, 'ls-tree', '-r', '--name-only', 'HEAD').split('\n').sort();
  assert.deepEqual(git(destination, 'ls-tree', '-r', '--name-only', 'main').split('\n').sort(), paths);
  for (const path of paths) {
    const a = run('git', ['-C', source, 'show', `HEAD:${path}`], { encoding: null });
    const b = run('git', ['-C', destination, 'show', `main:${path}`], { encoding: null });
    assert.equal(a.status, 0);
    assert.equal(b.status, 0);
    assert.deepEqual(b.stdout, a.stdout, path);
  }
}

function hook(f, body) {
  const path = join(f.remote, 'hooks', 'pre-receive');
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o700);
}

test('mirror workflow keeps push/CVE triggers, adds catch-up, and never force-pushes', () => {
  const yaml = readFileSync(workflow, 'utf8');
  assert.doesNotMatch(yaml, /git push[^\n]*--force/);
  assert.match(yaml, /push:\s*\n\s+branches:\s*\n\s+- gh-pages/);
  assert.match(yaml, /workflow_run:[\s\S]*Update Wordfence CVE ledger/);
  assert.match(yaml, /workflow_run\.conclusion == 'success'/);
  assert.match(yaml, /workflow_dispatch:/);
  assert.match(yaml, /pull_request:/);
  assert.match(yaml, /if: github.event_name != 'pull_request'/);
  assert.match(yaml, /schedule:\s*\n\s+- cron: ['"]23 \* \* \* \*['"]/);
  assert.match(yaml, /cancel-in-progress: false/);
  assert.match(yaml, /persist-credentials: false/);
  assert.match(yaml, /bash automation\/mirror-gitlab-pages\.sh/);
});

test('SHA-1 source syncs into protected SHA-256 history with exact tracked bytes', (t) => {
  const f = fixture(t);
  const result = mirror(f);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(git(f.remote, 'rev-parse', '--show-object-format'), 'sha256');
  git(f.remote, 'merge-base', '--is-ancestor', f.initial, 'main');
  assertSameFiles(f.source, f.remote);
  assert.equal(git(f.remote, 'log', '-1', '--format=%s'), `Mirror GitHub Pages ${f.sourceSha}`);
  assert.match(readFileSync(join(f.dir, 'output'), 'utf8'), new RegExp(`source_sha=${f.sourceSha}`));
});

test('a second changed source syncs normally and removes deleted source files', (t) => {
  const f = fixture(t);
  assert.equal(mirror(f).status, 0);
  const previous = git(f.remote, 'rev-parse', 'main');
  rmSync(join(f.source, 'untracked-secret.txt'));
  rmSync(join(f.source, 'assets/theme.css'));
  put(f.source, 'index.html', '<h1>next portfolio update</h1>\n');
  put(f.source, 'assets/theme.js', 'document.title = "updated";\n');
  commit(f.source, 'future GitHub update');
  const result = mirror(f);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  git(f.remote, 'merge-base', '--is-ancestor', previous, 'main');
  assertSameFiles(f.source, f.remote);
});

test('an unchanged snapshot succeeds without creating another commit', (t) => {
  const f = fixture(t);
  assert.equal(mirror(f).status, 0);
  const previous = git(f.remote, 'rev-parse', 'main');
  const result = mirror(f);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(git(f.remote, 'rev-parse', 'main'), previous);
  assert.match(result.stdout, /already matches/);
});

test('one transient push rejection is retried without rewriting history', (t) => {
  const f = fixture(t);
  hook(f, 'if [ ! -f mirror-rejected-once ]; then touch mirror-rejected-once; exit 1; fi');
  const result = mirror(f);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  git(f.remote, 'merge-base', '--is-ancestor', f.initial, 'main');
  assertSameFiles(f.source, f.remote);
});

test('permanent push rejection is a failure and leaves the remote untouched', (t) => {
  const f = fixture(t);
  hook(f, 'echo intentionally-rejected >&2; exit 1');
  const result = mirror(f);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /intentionally-rejected/);
  assert.equal(git(f.remote, 'rev-parse', 'main'), f.initial);
});

test('missing index.html fails before changing the destination', (t) => {
  const f = fixture(t);
  rmSync(join(f.source, 'index.html'));
  rmSync(join(f.source, 'untracked-secret.txt'));
  commit(f.source, 'invalid export');
  const result = mirror(f);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /index\.html/);
  assert.equal(git(f.remote, 'rev-parse', 'main'), f.initial);
});

test('a missing destination branch is not silently created', (t) => {
  const f = fixture(t);
  assert.notEqual(mirror(f, 'missing').status, 0);
  assert.equal(git(f.remote, 'for-each-ref', '--format=%(refname)', 'refs/heads'), 'refs/heads/main');
  assert.equal(git(f.remote, 'rev-parse', 'main'), f.initial);
});
