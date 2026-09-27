from pathlib import Path
import subprocess

# One-shot, hash-pinned application in the isolated review branch.
expected = {
    '_next/static/chunks/03~_g8i41_-g_-base.css': '1b771e34a5a7ffd8568e88e9349219168529e0bb',
    'assets/research-credentials.css': '1eeccd7392b0fd4365c31e59066cce9362670a7b',
    'assets/portfolio-redesign.js': '6895c265981dddb0fc5d1313d3c40bea2190c00c',
    'assets/portfolio-interactions.js': '266441ef0ba9860685fdcaa589ceb48425bad87c',
}
files = {}
for name, sha in expected.items():
    actual = subprocess.check_output(['git', 'hash-object', name], text=True).strip()
    if actual != sha:
        raise RuntimeError(f'{name}: expected {sha}, found {actual}; refusing to overwrite a different version')
    files[name] = Path(name).read_text()

def replace(name, old, new, count=1):
    actual = files[name].count(old)
    if actual != count:
        raise RuntimeError(f'{name}: expected {count} instances of {old[:100]!r}, found {actual}')
    files[name] = files[name].replace(old, new)

base = '_next/static/chunks/03~_g8i41_-g_-base.css'
replace(base, '.cve-ledger ul,', '.cve-ledger ul:not(.cve-row-list-v2),')
replace(base, '.cve-ledger li', '.cve-ledger ul:not(.cve-row-list-v2) li', 3)

css = 'assets/research-credentials.css'
replace(css, 'min-height:3.7rem;padding:.65rem .75rem', 'min-height:3.7rem;padding:.65rem 0')
replace(css, '.cve-row-v2{padding:.65rem}', '.cve-row-v2{padding:.65rem 0}')
replace(css, 'min-height:0;padding:.8rem .15rem', 'min-height:0;padding:.8rem 0')
replace(css, '.cve-summary-v2{grid-column:1/-1;grid-row:2;font-size:12.5px;line-height:1.35}', '.cve-summary-v2{grid-column:1/-1;grid-row:2;font-size:14px;line-height:1.45}\n  .cve-id-v2,.cve-score-v2,.severity-chip{font-size:12px}')
replace(css, '.cve-id-v2,.cve-score-v2{font-size:10.5px}', '.cve-id-v2,.cve-score-v2{font-size:12px}')
replace(css, '.severity-chip{padding:.18rem .4rem;font-size:9px}', '.severity-chip{padding:.25rem .4rem;font-size:12px}')
files[css] += '''

/* Primary destinations lead; the existing verification links remain secondary. */
.hero>.hero-actions,.hero>.hero-profiles{grid-column:1;min-width:0}
.hero-actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.25rem}
.hero-actions .primary-action:last-child{background:var(--paper);color:var(--ink)}
.hero-profiles{margin-top:1rem}
.hero-profiles-label{margin:0;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.4}
.hero-profiles .proof-links{margin-top:.25rem;gap:0 .9rem}
.hero-profiles .proof-links a{color:var(--muted);font-size:12px;font-weight:500}
'''

redesign = 'assets/portfolio-redesign.js'
replace(redesign, "  const list = document.querySelector('#top .proof-links');\n  if (!list) return;\n\n  list.replaceChildren();", """  const list = document.querySelector('#top .proof-links');
  if (!list) return;

  if (!list.closest('.hero-profiles')) {
    const actions = element('div', 'hero-actions');
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Portfolio actions');
    for (const [label, href] of [['View Research', '#research'], ['Contact', '#contact']]) {
      const link = element('a', 'primary-action', label);
      link.href = href;
      actions.appendChild(link);
    }
    const profiles = element('div', 'hero-profiles');
    const label = element('p', 'hero-profiles-label', 'Profiles & verification');
    list.before(actions, profiles);
    profiles.append(label, list);
  }

  list.replaceChildren();""")

interactions = 'assets/portfolio-interactions.js'
replace(interactions, '.credential-carousel{grid-column:2;grid-row:1/6;', '.credential-carousel{display:flex;flex-direction:column;grid-column:2;grid-row:1/7;')
replace(interactions, '.credential-carousel-stage{position:relative;', '.credential-carousel-stage{order:0;flex:none;position:relative;')
replace(interactions, '.credential-carousel-controls{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;', '.credential-carousel-controls{order:1;display:grid;grid-template-columns:3.5rem 44px minmax(0,1fr) 44px;')
replace(interactions, '.credential-carousel-arrow,.credential-carousel-dot{font:inherit;cursor:pointer}', '.credential-carousel-rotation{min-height:44px;padding:0 .35rem;border:1px solid var(--line);border-radius:0;background:var(--paper);color:var(--ink);font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;cursor:pointer}.credential-carousel-rotation:disabled{color:var(--muted);cursor:default}\n.credential-carousel-arrow,.credential-carousel-dot{font:inherit;cursor:pointer}')
replace(interactions, '      stage.className = "credential-carousel-stage";', '      stage.className = "credential-carousel-stage";\n      stage.id = `${MARKER}-slides`;')
replace(interactions, '      controls.className = "credential-carousel-controls";', '''      controls.className = "credential-carousel-controls";
      const rotation = document.createElement("button");
      rotation.className = "credential-carousel-rotation";
      rotation.type = "button";
      rotation.setAttribute("aria-controls", stage.id);''')
replace(interactions, '''      controls.append(previous, dots, next);
      root.appendChild(controls);''', '''      controls.append(rotation, previous, dots, next);
      // Controls remain visually below the cards, with Pause first in tab order.
      root.insertBefore(controls, stage);''')
replace(interactions, '''      let activeIndex = 0,
        paused = false,
        timer = 0;''', '''      let activeIndex = 0,
        hoverPaused = false,
        rotationEnabled = !reducedMotion.matches,
        pointerAction = null,
        timer = 0;''')
replace(interactions, '''      function schedule() {
        clearTimer();
        if (paused || reducedMotion.matches) return;
        timer = window.setTimeout(() => {''', '''      function schedule() {
        clearTimer();
        const stopped = !rotationEnabled || reducedMotion.matches;
        rotation.disabled = reducedMotion.matches;
        rotation.textContent = stopped ? "Play" : "Pause";
        rotation.setAttribute("aria-label", reducedMotion.matches
          ? "Automatic credential rotation disabled by reduced motion"
          : `${stopped ? "Play" : "Pause"} automatic credential rotation`);
        rotation.title = reducedMotion.matches
          ? "Automatic rotation is disabled by your reduced-motion preference."
          : "";
        if (hoverPaused || stopped) return;
        timer = window.setTimeout(() => {''')
replace(interactions, '      previous.addEventListener("click", () => select(activeIndex - 1));', '''      // Pointer focus pauses before click; preserve the action the user pressed.
      rotation.addEventListener("pointerdown", () => {
        pointerAction = rotationEnabled;
      });
      rotation.addEventListener("pointercancel", () => {
        pointerAction = null;
      });
      rotation.addEventListener("click", (event) => {
        const wasEnabled = event.detail > 0 && pointerAction !== null
          ? pointerAction
          : rotationEnabled;
        pointerAction = null;
        rotationEnabled = !wasEnabled;
        schedule();
      });
      previous.addEventListener("click", () => select(activeIndex - 1));''')
replace(interactions, '''      root.addEventListener("mouseenter", () => {
        paused = true;
        clearTimer();
      });
      root.addEventListener("mouseleave", () => {
        paused = root.contains(document.activeElement);
        if (!paused) schedule();
      });
      root.addEventListener("focusin", () => {
        paused = true;
        clearTimer();
      });
      root.addEventListener("focusout", (event) => {
        if (!root.contains(event.relatedTarget)) {
          paused = root.matches(":hover");
          if (!paused) schedule();
        }
      });
      reducedMotion.addEventListener?.("change", schedule);''', '''      root.addEventListener("mouseenter", () => {
        hoverPaused = true;
        schedule();
      });
      root.addEventListener("mouseleave", () => {
        hoverPaused = false;
        schedule();
      });
      root.addEventListener("focusin", () => {
        // Leaving the carousel must not restart rotation without explicit Play.
        rotationEnabled = false;
        schedule();
      });
      reducedMotion.addEventListener?.("change", () => {
        if (reducedMotion.matches) rotationEnabled = false;
        schedule();
      });''')
replace(interactions, 'z-index:30;width:32px;height:32px;', 'z-index:30;width:44px;height:44px;')

for name, content in files.items():
    Path(name).write_text(content)
    print(f'Updated {name}')
