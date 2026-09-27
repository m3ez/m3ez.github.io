from pathlib import Path
from html import escape

steps = [
    ('Scope', 'Target & boundaries'),
    ('Map', 'Attack surface'),
    ('Trace', 'Code / data paths'),
    ('Analyze', 'Root cause'),
    ('Exploit', 'Controlled proof'),
    ('Verify', 'Repeatability & impact'),
    ('Document', 'Evidence'),
    ('Report', 'Findings & remediation'),
]
items = []
for i, (label, detail) in enumerate(steps):
    connector = '<span class="method-connector" aria-hidden="true"><span class="method-pulse"></span></span>' if i < len(steps) - 1 else ''
    items.append(f'<li><div class="method-node"><span class="method-step" aria-hidden="true">{i+1:02}</span><strong class="method-label">{label}</strong><span class="method-detail">{escape(detail)}</span></div>{connector}</li>')
old = '<section class="trace-section method-section" id="method" aria-labelledby="method-title"><h2 id="method-title">Method</h2><p class="method-line">Map → trace → reproduce → document → verify</p></section>'
new = '<section class="trace-section method-section" id="method" aria-labelledby="method-title"><h2 id="method-title">Method</h2><p class="method-line">From attack surface to validated findings.</p><ol class="method-workflow" aria-label="Assessment and research workflow">' + ''.join(items) + '</ol></section>'
p = Path('index.html'); text = p.read_text(); assert text.count(old) == 1; p.write_text(text.replace(old, new))
p = Path('assets/portfolio-interactions.js'); text = p.read_text(); start = text.index('  (() => {\n    const METHOD_LINE ='); end = text.index('  })();', start) + len('  })();\n\n'); p.write_text(text[:start] + text[end:])
p = Path('assets/portfolio-redesign.js'); text = p.read_text(); anchor = "import { initializeInteractions } from './portfolio-interactions.js';"; assert text.count(anchor) == 1; text = text.replace(anchor, anchor + "\nimport { initializeMethodWorkflow } from './method-workflow.js';"); assert text.count('  initializeInteractions();') == 1; p.write_text(text.replace('  initializeInteractions();', '  initializeInteractions();\n  initializeMethodWorkflow();'))
Path('assets/method-workflow.js').write_text('''// The ordered HTML is the content; motion is a once-only decorative enhancement.
export function initializeMethodWorkflow() {
  const workflow = document.querySelector('#method .method-workflow');
  if (!workflow || workflow.dataset.methodInitialized) return;
  workflow.dataset.methodInitialized = 'true';

  const steps = [...workflow.children];
  const stepMs = 360;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer = null;
  let timer = 0;

  function complete() {
    window.clearTimeout(timer);
    timer = 0;
    workflow.dataset.flowState = 'complete';
    observer?.disconnect();
    reducedMotion.removeEventListener?.('change', onMotionChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', onResize);
  }

  function onMotionChange() {
    if (reducedMotion.matches) complete();
  }

  function onVisibilityChange() {
    if (document.hidden && workflow.dataset.flowState === 'running') complete();
  }

  function onResize() {
    if (workflow.dataset.flowState === 'running') complete();
  }

  // No JavaScript, unsupported observers, and reduced motion all retain the
  // completed, readable diagram without hiding any label or description.
  if (reducedMotion.matches || typeof IntersectionObserver === 'undefined') {
    complete();
    return;
  }

  steps.forEach((step, index) => {
    step.style.setProperty('--method-delay', `${index * stepMs}ms`);
  });
  workflow.dataset.flowState = 'waiting';
  reducedMotion.addEventListener?.('change', onMotionChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', onResize, { passive: true });

  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (workflow.dataset.flowState === 'waiting' && entry.isIntersecting && entry.intersectionRatio >= 0.2) {
        if (document.hidden) continue;
        workflow.dataset.flowState = 'running';
        timer = window.setTimeout(complete, steps.length * stepMs);
      } else if (workflow.dataset.flowState === 'running' && !entry.isIntersecting) {
        complete();
      }
    }
  }, { threshold: [0, 0.2] });
  observer.observe(workflow);
}
''')
css = '''

/* Method: Mermaid-inspired nodes, with a single sequential signal on the edges. */
#method.method-section{row-gap:1.3rem}
#method .method-line{color:var(--muted);font:400 13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#method .method-workflow{--method-gap:clamp(.9rem,1.6vw,1.4rem);display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:var(--method-gap);grid-column:1/-1;min-width:0;margin:0;padding:0;list-style:none}
#method .method-workflow>li{position:relative;min-width:0}
#method .method-node{position:relative;display:flex;flex-direction:column;gap:.35rem;height:100%;min-height:6.5rem;padding:.75rem .55rem;border:1px solid var(--black);background:var(--paper);color:var(--ink)}
#method .method-step{color:var(--muted);font:400 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em}
#method .method-label{font-size:13px;line-height:1.3;font-weight:700}
#method .method-detail{font-size:12px;line-height:1.4;overflow-wrap:break-word}
#method .method-connector{position:absolute;left:100%;top:50%;width:var(--method-gap);height:1px;background:var(--line)}
#method .method-connector::before{position:absolute;inset:0;background:var(--black);content:"";transform-origin:left center}
#method .method-connector::after{position:absolute;right:2px;top:50%;width:5px;height:5px;border-top:1px solid var(--black);border-right:1px solid var(--black);transform:translateY(-50%) rotate(45deg);content:""}
#method .method-pulse{position:absolute;left:0;top:50%;width:4px;height:4px;background:var(--black);transform:translate(-50%,-50%);opacity:0}
#method .method-workflow[data-flow-state="waiting"] .method-node{border-color:var(--line)}
#method .method-workflow[data-flow-state="waiting"] .method-connector::before{transform:scaleX(0)}
#method .method-workflow[data-flow-state="running"] .method-node{animation:method-node-arrive 280ms ease both;animation-delay:var(--method-delay)}
#method .method-workflow[data-flow-state="running"] .method-connector::before{animation:method-edge-draw 280ms linear both;animation-delay:calc(var(--method-delay) + 80ms)}
#method .method-workflow[data-flow-state="running"] .method-pulse{animation:method-pulse-travel 280ms linear;animation-delay:calc(var(--method-delay) + 80ms)}
@keyframes method-node-arrive{from{border-color:var(--line);background:var(--soft)}to{border-color:var(--black);background:var(--paper)}}
@keyframes method-edge-draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes method-pulse-travel{from{left:0;opacity:1}to{left:100%;opacity:1}}
@media (max-width:980px){
  #method.method-section{grid-template-columns:1fr;row-gap:.75rem}
  #method .method-workflow{--method-gap:1rem;grid-template-columns:1fr;margin-top:.35rem}
  #method .method-node{display:grid;grid-template-columns:1.5rem 5.75rem minmax(0,1fr);gap:.5rem;align-items:center;min-height:3.25rem;padding:.65rem .8rem}
  #method .method-label{font-size:14px}
  #method .method-detail{font-size:13px}
  #method .method-connector{left:50%;top:100%;width:1px;height:var(--method-gap)}
  #method .method-connector::before{transform-origin:center top}
  #method .method-connector::after{right:auto;left:50%;top:auto;bottom:2px;transform:translateX(-50%) rotate(135deg)}
  #method .method-pulse{left:50%;top:0}
  #method .method-workflow[data-flow-state="waiting"] .method-connector::before{transform:scaleY(0)}
  #method .method-workflow[data-flow-state="running"] .method-connector::before{animation-name:method-edge-draw-vertical}
  #method .method-workflow[data-flow-state="running"] .method-pulse{animation-name:method-pulse-travel-vertical}
}
@keyframes method-edge-draw-vertical{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes method-pulse-travel-vertical{from{top:0;opacity:1}to{top:100%;opacity:1}}
@media (prefers-reduced-motion:reduce){
  #method .method-workflow .method-node{animation:none!important;border-color:var(--black)}
  #method .method-workflow .method-connector::before{animation:none!important;transform:none!important}
  #method .method-workflow .method-pulse{animation:none!important;opacity:0!important}
}
'''
p = Path('assets/research-credentials.css'); p.write_text(p.read_text() + css)
