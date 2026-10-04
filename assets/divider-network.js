/* Existing horizontal dividers grow into the desktop margins.
 Every branch starts on a real curve. Resize/reflow remeasures anchors;
 scrolling only moves the existing SVGs, preserving their shapes.
 No runtime libraries, remote requests, canvas loop, polling or keyboard handlers. */
const NS = 'http://www.w3.org/2000/svg';
const ROOT = 'm3ez-edge-network';
const DESKTOP_MIN = 1280;
const MIN_SPACE = 72;
const SELECTORS = '.site-header, #content > .hero, #content > .trace-section, #content > hr, .site-footer';
const point = (c, t) => {
  const u = 1 - t;
  return [0, 1].map(i => u*u*u*c[0][i] + 3*u*u*t*c[1][i] + 3*u*t*t*c[2][i] + t*t*t*c[3][i]);
};
const tangent = (c, t) => {
  const u = 1 - t;
  return [0, 1].map(i => 3*u*u*(c[1][i]-c[0][i]) + 6*u*t*(c[2][i]-c[1][i]) + 3*t*t*(c[3][i]-c[2][i]));
};
const unit = v => { const l = Math.hypot(...v) || 1; return v.map(n => n/l); };
const svgElement = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
  return n;
};
function randomSeed() {
  return globalThis.crypto?.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : (Math.random() * 4294967296) >>> 0;
}
function rng(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function start() {
  if (document.querySelector('.' + ROOT)) return;
  const content = document.querySelector('#content') || document.querySelector('main');
  if (!content) return;
  const root = document.createElement('div');
  root.className = ROOT;
  root.setAttribute('aria-hidden', 'true');
  root.dataset.active = 'false';
  const wings = ['left', 'right'].map(side => {
    const wing = document.createElement('div');
    wing.className = `m3ez-edge-wing m3ez-edge-wing--${side}`;
    root.append(wing);
    return wing;
  });
  document.body.prepend(root);
  const seed = randomSeed();
  let pendingLayout = 0, pendingPosition = 0;
  let signature = '', clusters = [], sources = [];
  const keys = new WeakMap();
  let nextKey = 0;
  const observer = 'ResizeObserver' in window ? new ResizeObserver(scheduleLayout) : null;
  const watched = new Set();
  function watch(nodes) {
    if (!observer) return;
    const next = new Set(nodes);
    watched.forEach(n => { if (!next.has(n)) { observer.unobserve(n); watched.delete(n); } });
    next.forEach(n => { if (!watched.has(n)) { observer.observe(n); watched.add(n); } });
  }
  function inspectSource(node, left, right) {
    const r = node.getBoundingClientRect(), s = getComputedStyle(node);
    if (!r.width || s.visibility === 'hidden' || s.display === 'none') return null;
    // Never bridge across text to reach an inset/internal divider.
    if (Math.abs(r.left - left) > 1 || Math.abs(r.right - right) > 1) return null;
    const position = 'bottom';
    const actualWidth = parseFloat(s.borderBottomWidth) || 0;
    if (!actualWidth || s.borderBottomStyle !== 'solid') return null;
    const color = s.borderBottomColor;
    if (color === 'transparent' || /^rgba\([^,]+,[^,]+,[^,]+,\s*0(?:\.0+)?\)$/.test(color)) return null;
    if (!keys.has(node)) keys.set(node, ++nextKey);
    const weight = actualWidth;
    return {node, key:keys.get(node), name:node.id || (node.matches('.site-header') ? 'site-header' : `divider-${keys.get(node)}`), position, actualWidth, weight, color};
  }
  function sourceY(source) {
    const r = source.node.getBoundingClientRect();
    return source.position === 'center' ? r.top+r.height/2
      : source.position === 'top' ? r.top+source.actualWidth/2 : r.bottom-source.actualWidth/2;
  }
  function draw(source, side, width, sideSeed) {
    const random = rng(sideSeed), between = (a, b) => a+(b-a)*random();
    const spread = Math.min(142, width*.50);
    const half = Math.ceil(spread*1.5+18), height = half*2;
    const id = `edge-${source.key}-${side}`;
    const svg = svgElement('svg', {class:'m3ez-edge-cluster', width, height, viewBox:`0 0 ${width} ${height}`, focusable:'false', 'aria-hidden':'true'});
    svg.style.color = source.color;
    svg.style.setProperty('--edge-join-width', `${source.weight}px`);
    const defs = svgElement('defs');
    const gradient = svgElement('linearGradient', {id:`${id}-fade`, gradientUnits:'userSpaceOnUse', x1:side==='left'?width:0, y1:0, x2:side==='left'?0:width, y2:0});
    gradient.append(
      svgElement('stop', {offset:0, 'stop-color':'white', 'stop-opacity':1}),
      svgElement('stop', {offset:.16, 'stop-color':'white', class:'m3ez-edge-fade-body'}),
      svgElement('stop', {offset:.80, 'stop-color':'white', class:'m3ez-edge-fade-tail'}),
      svgElement('stop', {offset:1, 'stop-color':'white', 'stop-opacity':0})
    );
    const mask = svgElement('mask', {id:`${id}-mask`, maskUnits:'userSpaceOnUse', x:0, y:0, width, height, style:'mask-type:alpha'});
    mask.append(svgElement('rect', {x:0,y:0,width,height,fill:`url(#${id}-fade)`}));
    defs.append(gradient, mask);
    const field = svgElement('g', {mask:`url(#${id}-mask)`});
    const links = svgElement('g'), forks = svgElement('g'), core = svgElement('g'), nodes = svgElement('g');
    field.append(links, forks, core, nodes); svg.append(defs, field);
    const mapped = p => `${(side==='left'?width-p[0]:p[0]).toFixed(3)} ${p[1].toFixed(3)}`;
    const cubicData = c => `M${mapped(c[0])} C${mapped(c[1])} ${mapped(c[2])} ${mapped(c[3])}`;
    const path = (parent, d, kind, attrs = {}) => {
      const n = svgElement('path', {d, class:`m3ez-edge-${kind}`, ...attrs}); parent.append(n); return n;
    };
    const node = (p, dot = false) => {
      nodes.append(svgElement('circle', {cx:side==='left'?width-p[0]:p[0], cy:p[1], r:dot?1.05:1.8, class:`m3ez-edge-${dot?'dot':'node'}`}));
    };
    const stem = Math.min(27, width*.12), reach = width*between(.92,.985);
    const drift = spread*between(-.30,.30);
    const spine = [[stem,half], [stem+(reach-stem)*.30,half], [reach*.77,half+drift*.22], [reach,half+drift]];
    const trunkD = `M${mapped([0,half])} L${mapped(spine[0])} C${mapped(spine[1])} ${mapped(spine[2])} ${mapped(spine[3])}`;
    const trunk = path(core,trunkD,'trunk',{id:`${id}-trunk`, 'data-anchor':source.name,'data-side':side});
    const pulse = path(core,trunkD,'pulse',{pathLength:100});
    pulse.style.setProperty('--trace-time',`${between(14,21).toFixed(2)}s`);
    pulse.style.setProperty('--trace-delay',`${-between(0,21).toFixed(2)}s`);
    const forkCurves=[];
    const upperLimit = source.node.matches('.site-header') ? .34 : 1;
    function grow(parentCurve, parentPath, t, end, kind, key) {
      const origin=point(parentCurve,t), direction=unit(tangent(parentCurve,t));
      const handle=Math.max(4,(end[0]-origin[0])*.37);
      const curve=[origin,[origin[0]+direction[0]*handle,origin[1]+direction[1]*handle],
        [end[0]-(end[0]-origin[0])*.17,end[1]-(end[1]-origin[1])*.24],end];
      const n=path(forks,cubicData(curve),kind,{id:`${id}-${key}`,'data-parent':parentPath.id});
      return {curve,path:n};
    }
    for(let i=0;i<3;i++){
      const t=[between(.12,.21),between(.28,.38),between(.50,.59)][i];
      const direction=i===1?1:-1;
      const amplitude=spread*between(i===2?.42:.70,i===2?.68:1.05)*(direction<0?upperLimit:1);
      const end=[width*between(i===0?.70:.85,i===0?.88:.98),half+amplitude*direction];
      const fork=grow(spine,trunk,t,end,'branch',`branch-${i}`);
      forkCurves.push(fork);
      node(point(fork.curve,between(.45,.66)),i===2);
      if(i<2 && width>140){
        const splitAt=between(.48,.61), from=point(fork.curve,splitAt);
        const twigEnd=[Math.min(width*.98,from[0]+width*between(.18,.27)),from[1]+direction*spread*between(.33,.50)];
        grow(fork.curve,fork.path,splitAt,twigEnd,'hairline',`twig-${i}`);
      }
    }
    // Sparse curved links join points ON the branches; no detached polygon mesh.
    function connect(fromCurve,fromPath,t,toCurve,u,key){
      const a=point(fromCurve,t), b=point(toCurve,u);
      if(b[0]-a[0]<14)return;
      const da=unit(tangent(fromCurve,t)), db=unit(tangent(toCurve,u));
      const h=Math.hypot(b[0]-a[0],b[1]-a[1])*.27;
      const c=[a,[a[0]+da[0]*h,a[1]+da[1]*h],[b[0]-db[0]*h,b[1]-db[1]*h],b];
      path(links,cubicData(c),'mesh',{id:`${id}-${key}`,'data-parent':fromPath.id});
      node(a,true);
    }
    connect(forkCurves[0].curve,forkCurves[0].path,.49,forkCurves[2].curve,.59,'link-0');
    connect(forkCurves[1].curve,forkCurves[1].path,.43,spine,.82,'link-1');
    node(point(spine,between(.40,.48)));
    return {svg,source,half};
  }
  function position() {
    pendingPosition=0;
    if(root.dataset.active!=='true')return;
    const positions=new Map(sources.map(s=>[s.key,sourceY(s)]));
    clusters.forEach(c=>{
      const y=positions.get(c.source.key)-c.half;
      c.svg.style.transform=`translate3d(0,${y.toFixed(3)}px,0)`;
      const offscreen = y > innerHeight + 20 || y + c.half * 2 < -20;
      c.svg.style.visibility = offscreen ? 'hidden' : 'visible';
      c.svg.dataset.offscreen = String(offscreen);
    });
  }
  function layout() {
    pendingLayout=0;
    const viewport=document.documentElement.clientWidth;
    const containers=[content,...document.querySelectorAll('.site-header,.site-footer')];
    const boxes=containers.map(n=>n.getBoundingClientRect()).filter(r=>r.width>0);
    const left=Math.min(...boxes.map(r=>r.left)),right=Math.max(...boxes.map(r=>r.right));
    const active=viewport>=DESKTOP_MIN && Math.min(left,viewport-right)>=MIN_SPACE;
    root.dataset.active=String(active);
    const candidates=[...new Set(document.querySelectorAll(SELECTORS))];
    watch([...containers,...candidates]);
    if(!active){wings.forEach(w=>w.replaceChildren());clusters=[];sources=[];signature='';return;}
    const maximum=Math.max(72,parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge-max-width'))||380);
    const widths=[Math.min(maximum,left),Math.min(maximum,viewport-right)];
    Object.assign(wings[0].style,{left:`${left-widths[0]}px`,width:`${widths[0]}px`});
    Object.assign(wings[1].style,{left:`${right}px`,width:`${widths[1]}px`});
    sources=candidates.map(n=>inspectSource(n,left,right)).filter(Boolean);
    const next=JSON.stringify([widths,seed,sources.map(s=>[s.key,s.weight,s.color,s.position])]);
    if(signature!==next){
      signature=next;clusters=[];wings.forEach(w=>w.replaceChildren());
      sources.forEach(source=>['left','right'].forEach((side,i)=>{
        const sideSeed=(seed ^ Math.imul(source.key,0x85EBCA6B) ^ (i?0x9E3779B9:0))>>>0;
        const cluster=draw(source,side,widths[i],sideSeed);
        wings[i].append(cluster.svg);clusters.push(cluster);
      }));
    } else {
      // Refreshed records include current border dimensions for exact reflow placement.
      const byKey=new Map(sources.map(s=>[s.key,s]));
      clusters.forEach(c=>{c.source=byKey.get(c.source.key);});
    }
    position();
  }
  function scheduleLayout(){if(!pendingLayout)pendingLayout=requestAnimationFrame(layout);}
  function schedulePosition(){if(!pendingPosition)pendingPosition=requestAnimationFrame(position);}
  window.addEventListener('resize',scheduleLayout,{passive:true});
  window.addEventListener('scroll',schedulePosition,{passive:true});
  document.addEventListener('load',scheduleLayout,true);
  document.addEventListener('m3ez:edge-refresh',scheduleLayout);
  const visibility=()=>{root.dataset.paused=String(document.hidden);};
  document.addEventListener('visibilitychange',visibility);
  new MutationObserver(scheduleLayout).observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','open']});
  new MutationObserver(scheduleLayout).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-portfolio-expanded','class','style']});
  if(document.fonts?.ready)document.fonts.ready.then(scheduleLayout);
  visibility();scheduleLayout();
}
// The stylesheet loads independently of CVE data. Do not mount unstyled SVGs
// while it is loading, and fail invisibly if an asset cannot be loaded.
export function initializeDividerNetwork() {
  if (!document.querySelector('#content') || document.getElementById('m3ez-edge-network-styles')) return;
  const stylesheet = document.createElement('link');
  stylesheet.id = 'm3ez-edge-network-styles';
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./divider-network.css', import.meta.url).href;
  stylesheet.addEventListener('load', start, { once: true });
  document.head.append(stylesheet);
}
