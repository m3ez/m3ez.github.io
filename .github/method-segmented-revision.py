from pathlib import Path
import re, html
w = Path('.')
phases = [('discover','Discover',[('Scope','Target & boundaries'),('Map','Attack surface'),('Trace','Code & data paths')]),('test','Test',[('Analyze','Root cause'),('Exploit','Controlled proof'),('Verify','Repro & impact')]),('deliver','Deliver',[('Document','Evidence'),('Report','Findings & fixes')])]
parts = ['<section class="trace-section method-section" id="method" aria-labelledby="method-title"><h2 id="method-title">Method</h2><p class="method-line">From attack surface to validated findings.</p><div class="method-workflow" role="group" aria-label="Assessment and research workflow">']
step = 1
for key, title, items in phases:
    parts.append(f'<div class="method-phase" data-phase="{key}"><h3 class="method-phase-title" id="method-phase-{key}">{title}</h3><div class="method-phase-flow"><ol class="method-strip" role="list" aria-labelledby="method-phase-{key}" start="{step}">')
    for label, desc in items:
        cls = 'method-node method-node-final' if label == 'Report' else 'method-node'
        parts.append(f'<li><div class="{cls}" id="method-{label.lower()}"><span class="method-step" aria-hidden="true">{step:02}</span><strong class="method-label">{label}</strong><span class="method-detail">{html.escape(desc)}</span></div></li>')
        step += 1
    parts.append('</ol>')
    if key == 'test':
        parts.append('<div class="method-feedback" data-from="method-verify" data-to="method-analyze"><svg class="method-feedback-horizontal" viewBox="0 0 300 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="method-feedback-path" d="M250 1V20H50V1" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/><path d="m46 5 4-4 4 4" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg><svg class="method-feedback-vertical" viewBox="0 0 20 300" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="method-feedback-path" d="M1 250H14V50H1" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/><path d="m5 46-4 4 4 4" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg><p class="method-feedback-label"><span class="sr-only">Verify to Analyze: </span>Iterate if not reproducible</p></div>')
    parts.append('</div></div>')
parts.append('</div></section>')
f = w / 'index.html'
old = f.read_text()
new, count = re.subn(r'<section\b[^>]*id="method"[\s\S]*?</section>', ''.join(parts), old, count=1)
assert count == 1
f.write_text(new)
f = w / 'assets/method-workflow.js'
s = f.read_text().replace('// Semantic HTML stays readable; the decorative signal loops only while visible.', '// Semantic HTML stays readable; strip highlights loop only while visible.')
s = s.replace('const steps = [...workflow.children];', "const steps = [...workflow.querySelectorAll('.method-node')];").replace('const stepMs = 480;', 'const stepMs = 600;\n  const restMs = 800; // Let the Report endpoint rest before the next pass.').replace('`${steps.length * stepMs}ms`', '`${steps.length * stepMs + restMs}ms`')
f.write_text(s)
f = w / 'assets/research-credentials.css'
s = f.read_text()
assert s.count('/* Method:') == 1
s = s[:s.index('/* Method:')] + '''/* Method: three phases share one segmented strip; only the return path has an arrow. */
#method.method-section{row-gap:1.4rem}
#method .method-line{color:var(--muted);font:400 13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#method .method-workflow{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:0;grid-column:1/-1;min-width:0;padding:0 0 3.5rem;margin:0}
#method .method-phase{display:flex;flex-direction:column;grid-column:span 3;min-width:0}
#method .method-phase[data-phase="deliver"]{grid-column:span 2}
#method .method-phase-title{margin:0 1.1rem .8rem 0;padding:0 0 .55rem;border-bottom:1px solid var(--line);font-size:14px;line-height:1.35;font-weight:700;color:var(--ink)}
#method .method-phase:last-child .method-phase-title{margin-right:0}
#method .method-phase-flow{position:relative;flex:1;min-width:0}
#method .method-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;height:100%;min-width:0;padding:0;margin:0;list-style:none}
#method .method-phase[data-phase="deliver"] .method-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
#method .method-strip>li{min-width:0}
#method .method-node{position:relative;display:flex;flex-direction:column;gap:.4rem;height:100%;min-height:8rem;padding:.8rem .7rem;border:1px solid var(--black);border-left:0;background:var(--paper);color:var(--ink)}
#method .method-phase:first-child .method-strip>li:first-child .method-node{border-left:1px solid var(--black)}
#method .method-node-final{background:var(--black);color:var(--paper)}
#method .method-step{margin-bottom:.25rem;color:var(--muted);font:400 11px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
#method .method-label{font-size:14px;line-height:1.3;font-weight:700}
#method .method-detail{color:var(--muted);font-size:12px;line-height:1.4;overflow-wrap:break-word}
#method .method-node-final .method-step,#method .method-node-final .method-detail{color:var(--paper)}
#method .method-node::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--black);transform:scaleX(0);transform-origin:left center;opacity:0;pointer-events:none}
#method .method-node-final::before{background:var(--paper)}
#method .method-workflow[data-flow-state="running"] .method-node:not(.method-node-final){animation:method-segment-flow var(--method-cycle) linear infinite;animation-delay:var(--method-delay)}
#method .method-workflow[data-flow-state="running"] .method-node::before{animation:method-segment-edge var(--method-cycle) linear infinite;animation-delay:var(--method-delay)}
/* Each stage receives 600ms in the 5600ms cycle, followed by an 800ms endpoint rest. */
@keyframes method-segment-flow{0%,8%{background:var(--soft)}12%,100%{background:var(--paper)}}
@keyframes method-segment-edge{0%{transform:scaleX(0);opacity:1}10.714%{transform:scaleX(1);opacity:1}14%,100%{transform:scaleX(1);opacity:0}}
#method .method-feedback{color:var(--muted)}
#method .method-feedback-horizontal{position:absolute;top:calc(100% + 3px);left:0;display:block;width:100%;height:28px;pointer-events:none}
#method .method-feedback-vertical{display:none}
#method .method-feedback-label{position:absolute;top:calc(100% + 32px);left:0;right:0;margin:0;text-align:center;font:400 11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (max-width:1100px) and (min-width:981px){
  #method .method-node{padding:.7rem .45rem}
  #method .method-label{font-size:13px}
}
@media (max-width:980px){
  #method.method-section{grid-template-columns:1fr;row-gap:.75rem}
  #method .method-workflow{grid-template-columns:1fr;gap:1.25rem;margin-top:.5rem;padding:0 20px 0 0}
  #method .method-phase,#method .method-phase[data-phase="deliver"]{grid-column:auto}
  #method .method-phase-title{margin:0 0 .65rem;padding-bottom:.5rem;font-size:14px}
  #method .method-strip,#method .method-phase[data-phase="deliver"] .method-strip{grid-template-columns:1fr}
  #method .method-node{display:grid;grid-template-columns:1.7rem minmax(0,1fr);grid-template-rows:auto auto;gap:.2rem .55rem;align-content:center;min-height:4.25rem;padding:.7rem .8rem;border-left:1px solid var(--black);border-top:0}
  #method .method-strip>li:first-child .method-node{border-top:1px solid var(--black)}
  #method .method-step{grid-column:1;grid-row:1/3;align-self:start;margin:.15rem 0 0}
  #method .method-label,#method .method-detail{grid-column:2}
  #method .method-detail{font-size:13px}
  #method .method-phase[data-phase="test"]{margin-bottom:1.65rem}
  #method .method-feedback-horizontal{display:none}
  #method .method-feedback-vertical{position:absolute;left:100%;top:0;display:block;width:20px;height:100%;pointer-events:none}
  #method .method-feedback-label{top:calc(100% + .5rem);font-size:11px}
}
@media (prefers-reduced-motion:reduce){
  #method .method-workflow .method-node{animation:none!important}
  #method .method-workflow .method-node::before{animation:none!important;opacity:0!important}
}
'''
f.write_text(s)
