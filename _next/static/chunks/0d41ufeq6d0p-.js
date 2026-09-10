(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,16989,e=>{"use strict";var r=e.i(43476),t=e.i(71645);let s=/^CVE-(?:1999|2\d{3})-\d{4,}$/,i=["cvss","href","id","title"],n=["items","profile","schemaVersion","source"];function l(e,r){if(!e||"object"!=typeof e||Array.isArray(e))return!1;let t=Object.keys(e).sort();return t.length===r.length&&t.every((e,t)=>e===r[t])}function o(e){if("string"!=typeof e||!e)return null;try{let r=new URL(e);return"https:"!==r.protocol||!r.hostname||r.username||r.password?null:r}catch{return null}}function c(e){return Number.isFinite(e)&&e>=0&&e<=10&&Number.isInteger(10*e)}function a(e){if(!l(e,i))return null;let r="string"==typeof e.title?e.title.normalize("NFKC").trim().replace(/\s+/g," "):"";return"string"==typeof e.id&&s.test(e.id)&&r&&c(e.cvss)&&null!==o(e.href)?{id:e.id,title:r,cvss:e.cvss,href:e.href}:null}function u(e,r){let[,t,s]=e.id.match(/^CVE-(\d{4})-(\d+)$/),[,i,n]=r.id.match(/^CVE-(\d{4})-(\d+)$/),l=Number(i)-Number(t);if(l)return l;let o=BigInt(s),c=BigInt(n);return o===c?0:o>c?-1:1}function d(e,r){let t=new Map;for(let e of Array.isArray(r)?r:[]){let r=a(e);r&&!t.has(r.id)&&t.set(r.id,r)}for(let r of Array.isArray(e)?e:[]){let e=a(r);e&&t.set(e.id,e)}return[...t.values()].sort(u)}function h(e){if(!l(e,n)||1!==e.schemaVersion||"Wordfence"!==e.source||null===o(e.profile)||!Array.isArray(e.items)||0===e.items.length)return null;let r=[],t=new Set;for(let s of e.items){let e=a(s);if(!e||t.has(e.id)||!function(e){let r=o(e);return null!==r&&("wordfence.com"===r.hostname||r.hostname.endsWith(".wordfence.com"))}(e.href)&&!function(e,r){let t=o(e),s="string"==typeof e?/^https:\/\/([^/?#]+)/iu.exec(e)?.[1]:void 0;if(null===t||"cve.org"!==t.hostname&&"www.cve.org"!==t.hostname||""!==t.port||s?.toLowerCase()!==t.hostname||"/CVERecord"!==t.pathname||""!==t.hash)return!1;let i=[...t.searchParams];return 1===i.length&&"id"===i[0][0]&&i[0][1]===r}(e.href,e.id))return null;t.add(e.id),r.push(e)}return{schemaVersion:1,source:"Wordfence",profile:e.profile,items:r}}let f=[{id:"CVE-2026-32498",title:"WordPress RegistrationMagic Plugin <= 6.0.7.6 is vulnerable to a high priority Broken Access Control",cvss:7.5,href:"https://patchstack.com/database/wordpress/plugin/custom-registration-form-builder-with-submission-manager/vulnerability/wordpress-registrationmagic-plugin-6-0-7-6-broken-access-control-vulnerability-2"},{id:"CVE-2026-23799",title:"WordPress Tutor LMS Plugin <= 3.9.5 is vulnerable to a medium priority Broken Access Control",cvss:6.5,href:"https://patchstack.com/database/wordpress/plugin/tutor/vulnerability/wordpress-tutor-lms-plugin-3-9-5-broken-access-control-vulnerability"},{id:"CVE-2026-32385",title:"WordPress RegistrationMagic Plugin <= 6.0.7.6 is vulnerable to Broken Access Control",cvss:5.4,href:"https://patchstack.com/database/Wordpress/Plugin/custom-registration-form-builder-with-submission-manager/vulnerability/wordpress-registrationmagic-plugin-6-0-7-6-broken-access-control-vulnerability"},{id:"CVE-2025-47555",title:"WordPress Tutor LMS Plugin <= 3.9.4 is vulnerable to Insecure Direct Object References (IDOR)",cvss:3.8,href:"https://patchstack.com/database/wordpress/plugin/tutor/vulnerability/wordpress-tutor-lms-plugin-3-9-4-insecure-direct-object-references-idor-vulnerability"},{id:"CVE-2024-4367",title:"WordPress DearFlip Plugin <= 2.2.55 is vulnerable to Cross Site Scripting (XSS)",cvss:6.5,href:"https://patchstack.com/database/wordpress/plugin/3d-flipbook-dflip-lite/vulnerability/wordpress-pdf-flipbook-3d-flipbook-pdf-embed-pdf-viewer-plugin-2-2-55-cross-site-scripting-xss-vulnerability"}],p=[{id:"CVE-2025-66307",title:"Grav Admin Plugin vulnerable to User Enumeration & Email Disclosure",cvss:6.5,href:"https://github.com/advisories/GHSA-q3qx-cp62-f6m7"}];function m({items:e,scope:t,sourceForId:s}){return Object.entries(function(e){let r={};for(let t of d(e,[])){let e=t.id.slice(4,8);r[e]||(r[e]=[]),r[e].push(t)}return r}(e)).sort(([e],[r])=>Number(r)-Number(e)).map(([e,i])=>{let n=`cve-year-${t}-${e}`;return(0,r.jsxs)("section",{"aria-labelledby":n,children:[(0,r.jsx)("h4",{id:n,children:e}),(0,r.jsx)("ul",{children:i.map(e=>{var t;return(0,r.jsxs)("li",{children:[(0,r.jsx)("a",{href:e.href,target:"_blank",rel:"noopener noreferrer",children:e.id}),(0,r.jsxs)("span",{children:[" — ",e.title," — ",c(t=e.cvss)?0===t?"None":t<4?"Low":t<7?"Medium":t<9?"High":"Critical":null," (",e.cvss.toFixed(1),")"]}),(0,r.jsxs)("span",{className:"sr-only",children:[" Source: ",s(e.id),"."]})]},e.id)})})]},e)})}e.s(["CveLedger",0,function({seed:e}){let[s,i]=(0,t.useState)(e);(0,t.useEffect)(()=>{let r=!1;return async function(){try{let t=await fetch("/data/wordfence-cves.json",{cache:"no-store"});if(!t.ok)return;let s=function(e,r){let t=h(e),s=h(r);if(!t||!s)return null;let i=new Set(s.items.map(e=>e.id));return t.items.every(e=>i.has(e.id))?s:null}(e,await t.json());!r&&s&&i(s)}catch{}}(),()=>{r=!0}},[e]);let n=(0,t.useMemo)(()=>d(s.items,f),[s]),l=(0,t.useMemo)(()=>new Set(s.items.map(e=>e.id)),[s]);return(0,r.jsxs)("div",{className:"cve-ledger",children:[(0,r.jsxs)("section",{"aria-labelledby":"wordpress-cves-title",children:[(0,r.jsx)("h3",{id:"wordpress-cves-title",children:"WordPress Plugin CVEs"}),(0,r.jsx)(m,{items:n,scope:"wordpress",sourceForId:e=>l.has(e)?"Wordfence":"Patchstack"})]}),(0,r.jsxs)("section",{"aria-labelledby":"other-cves-title",children:[(0,r.jsx)("h3",{id:"other-cves-title",children:"Other CVEs"}),(0,r.jsx)(m,{items:p,scope:"other",sourceForId:()=>"GitHub Advisory"})]})]})}],16989)}]);

;(() => {
  const MARKER = "m3ez-credential-carousel-v1";
  const ROTATION_MS = 4500;
  const css = `
.hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(25rem,.95fr);column-gap:clamp(2rem,5vw,4rem);align-items:center}
.hero>.role,.hero>h1,.hero>.trust-statement,.hero>.hero-copy,.hero>.proof-links{grid-column:1}
.credential-carousel{grid-column:2;grid-row:1/6;width:100%;max-width:38rem;min-width:0;justify-self:end}
.credential-carousel-stage{position:relative;height:15rem;overflow:hidden}
.credential-carousel-card{position:absolute;top:50%;left:50%;z-index:0;display:flex;flex-direction:column;width:min(58%,18rem);height:12.75rem;padding:1.15rem;border:1px solid var(--line);background:var(--paper);color:var(--ink);opacity:0;transform:translate(-50%,-50%) scale(.68);pointer-events:none;text-decoration:none;cursor:pointer;transition:left 400ms ease,opacity 400ms ease,transform 400ms ease,border-color 400ms ease}
.credential-carousel-card[data-position="current"]{left:50%;z-index:3;border-color:var(--black);opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
.credential-carousel-card[data-position="previous"]{left:18%;z-index:2;opacity:.46;transform:translate(-50%,calc(-50% + .6rem)) scale(.78);pointer-events:auto}
.credential-carousel-card[data-position="next"]{left:82%;z-index:2;opacity:.46;transform:translate(-50%,calc(-50% + .6rem)) scale(.78);pointer-events:auto}
.credential-carousel-card[data-position="past"]{left:-12%;opacity:0;transform:translate(-50%,calc(-50% + .8rem)) scale(.68)}
.credential-carousel-card[data-position="future"]{left:112%;opacity:0;transform:translate(-50%,calc(-50% + .8rem)) scale(.68)}
.credential-carousel-kicker,.credential-carousel-issuer,.credential-carousel-issued,.credential-carousel-verify{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.credential-carousel-kicker{color:var(--muted);font-size:10px;letter-spacing:.16em;text-transform:uppercase}
.credential-carousel-title{margin-top:1.05rem;font-size:clamp(26px,3vw,34px);line-height:1;letter-spacing:-.025em}
.credential-carousel-issuer{margin-top:.7rem;font-size:13px}.credential-carousel-issued{margin-top:.2rem;color:var(--muted);font-size:11px}.credential-carousel-verify{align-self:flex-end;margin-top:auto;font-size:12px}
.credential-carousel-controls{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:.25rem;align-items:center;width:min(100%,30rem);margin:.1rem auto 0}
.credential-carousel-arrow,.credential-carousel-dot{font:inherit;cursor:pointer}.credential-carousel-arrow{min-width:44px;min-height:44px;padding:0;border:0;background:transparent;color:var(--ink);opacity:0;pointer-events:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:20px}
.credential-carousel:hover .credential-carousel-arrow,.credential-carousel:focus-within .credential-carousel-arrow{opacity:1;pointer-events:auto}
.credential-carousel-dots{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:0 .05rem}.credential-carousel-dot{position:relative;width:18px;min-height:36px;padding:0;border:0;background:transparent}
.credential-carousel-dot::before{position:absolute;top:50%;left:50%;width:6px;height:6px;background:var(--line);clip-path:circle(50%);content:"";transform:translate(-50%,-50%)}.credential-carousel-dot.is-active::before{background:var(--black)}
@media (hover:none){.credential-carousel-arrow{opacity:1;pointer-events:auto}}@media (prefers-reduced-motion:reduce){.credential-carousel-card{transition:none}}
@media (max-width:880px){.hero{grid-template-columns:1fr;column-gap:0}.credential-carousel{grid-column:1;grid-row:auto;max-width:36rem;justify-self:center;margin-top:1.75rem}}
@media (max-width:640px){.credential-carousel-stage{height:12.5rem}.credential-carousel-card{width:min(72%,17rem);height:11.5rem;padding:1rem}.credential-carousel-card[data-position="previous"]{left:9%}.credential-carousel-card[data-position="next"]{left:91%}.credential-carousel-card[data-position="past"]{left:-24%}.credential-carousel-card[data-position="future"]{left:124%}.credential-carousel-title{font-size:clamp(24px,9vw,30px)}.credential-carousel-controls{width:100%}.credential-carousel-dot{width:16px;min-height:32px}.credential-carousel-arrow{opacity:1;pointer-events:auto}}
`;
  function mount(){if(document.getElementById(MARKER))return;const hero=document.querySelector(".hero");if(!hero)return;const sourceItems=[...document.querySelectorAll('.credential-list li[data-kind="credential"]')].map(li=>{const link=li.querySelector("a");if(!link)return null;const meta=li.querySelector(".record-meta")?.textContent||"";const[issuer="",issued=""]=meta.split("·").map(v=>v.trim());return{title:(link.textContent||"").trim(),issuer,issued:issued.slice(0,4),href:link.href}}).filter(Boolean);const items=sourceItems;if(items.length<2)return;const style=document.createElement("style");style.id=`${MARKER}-style`;style.textContent=css;document.head.appendChild(style);const root=document.createElement("div");root.id=MARKER;root.className="credential-carousel";root.setAttribute("role","region");root.setAttribute("aria-roledescription","carousel");root.setAttribute("aria-label","Credentials");const stage=document.createElement("div");stage.className="credential-carousel-stage";root.appendChild(stage);const cards=items.map((item,index)=>{const card=document.createElement("a");card.className="credential-carousel-card";card.href=item.href;card.target="_blank";card.rel="noopener noreferrer";card.dataset.index=String(index);const kicker=document.createElement("span");kicker.className="credential-carousel-kicker";kicker.textContent="Certification";const title=document.createElement("strong");title.className="credential-carousel-title";title.textContent=item.title;const issuer=document.createElement("span");issuer.className="credential-carousel-issuer";issuer.textContent=item.issuer;const issued=document.createElement("span");issued.className="credential-carousel-issued";issued.textContent=item.issued;const verify=document.createElement("span");verify.className="credential-carousel-verify";card.append(kicker,title,issuer,issued,verify);stage.appendChild(card);return{card,verify,item}});const controls=document.createElement("div");controls.className="credential-carousel-controls";const previous=document.createElement("button");previous.className="credential-carousel-arrow";previous.type="button";previous.setAttribute("aria-label","Previous credential");previous.textContent="←";const dots=document.createElement("div");dots.className="credential-carousel-dots";dots.setAttribute("aria-label","Choose credential");const dotButtons=items.map((item,index)=>{const dot=document.createElement("button");dot.className="credential-carousel-dot";dot.type="button";dot.setAttribute("aria-label",`Show ${item.title} credential`);dot.addEventListener("click",()=>select(index));dots.appendChild(dot);return dot});const next=document.createElement("button");next.className="credential-carousel-arrow";next.type="button";next.setAttribute("aria-label","Next credential");next.textContent="→";controls.append(previous,dots,next);root.appendChild(controls);hero.appendChild(root);const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");let activeIndex=0,paused=false,timer=0;function positionFor(index){if(index===activeIndex)return"current";const forward=(index-activeIndex+items.length)%items.length;if(forward===1)return"next";if(forward===items.length-1)return"previous";return forward<=items.length/2?"future":"past"}function render(){cards.forEach(({card,verify,item},index)=>{const position=positionFor(index),current=position==="current",visible=current||position==="previous"||position==="next";card.dataset.position=position;card.tabIndex=visible?0:-1;if(visible)card.removeAttribute("aria-hidden");else card.setAttribute("aria-hidden","true");if(current)card.setAttribute("aria-current","true");else card.removeAttribute("aria-current");card.setAttribute("aria-label",current?`Verify ${item.title} credential (opens in new tab)`:`Show ${item.title} credential`);verify.textContent=current?"Verified ↗":""});dotButtons.forEach((dot,index)=>{dot.classList.toggle("is-active",index===activeIndex);if(index===activeIndex)dot.setAttribute("aria-current","true");else dot.removeAttribute("aria-current")})}function clearTimer(){if(timer)window.clearTimeout(timer);timer=0}function schedule(){clearTimer();if(paused||reducedMotion.matches)return;timer=window.setTimeout(()=>{activeIndex=(activeIndex+1)%items.length;render();schedule()},ROTATION_MS)}function select(index){activeIndex=(index+items.length)%items.length;render();schedule()}previous.addEventListener("click",()=>select(activeIndex-1));next.addEventListener("click",()=>select(activeIndex+1));cards.forEach(({card},index)=>card.addEventListener("click",event=>{if(index!==activeIndex){event.preventDefault();select(index)}}));root.addEventListener("mouseenter",()=>{paused=true;clearTimer()});root.addEventListener("mouseleave",()=>{paused=root.contains(document.activeElement);if(!paused)schedule()});root.addEventListener("focusin",()=>{paused=true;clearTimer()});root.addEventListener("focusout",event=>{if(!root.contains(event.relatedTarget)){paused=root.matches(":hover");if(!paused)schedule()}});reducedMotion.addEventListener?.("change",schedule);render();schedule()}
  if(document.readyState==="complete")requestAnimationFrame(mount);else window.addEventListener("load",()=>requestAnimationFrame(mount),{once:true});
})();

;(() => {
  const METHOD_LINE = "Map > Trace > Analyze > Exploit > Verify > Document > Report";
  const updateMethod = () => {
    const methodLine = document.querySelector(".method-line");
    if (methodLine) methodLine.textContent = METHOD_LINE;
  };

  if (document.readyState === "complete") requestAnimationFrame(updateMethod);
  else window.addEventListener("load", () => requestAnimationFrame(updateMethod), { once: true });
})();

;(() => {
  const MARKER = "m3ez-swipe-nav-v1";
  const SWIPE_THRESHOLD = 48;

  function enhance() {
    if (!document.querySelector(".hero")) return;
    if (document.documentElement.dataset.m3ezSwipeNav === MARKER) return;
    document.documentElement.dataset.m3ezSwipeNav = MARKER;

    const nav = document.querySelector(".site-header nav");
    if (nav && !nav.querySelector('a[href="#credentials"]')) {
      const credentials = document.createElement("a");
      credentials.href = "#credentials";
      credentials.className = "nav-credentials";
      credentials.textContent = "Credentials";
      const consulting = nav.querySelector(".nav-consulting");
      nav.insertBefore(credentials, consulting || nav.lastElementChild);
    }

    const root = document.getElementById("m3ez-credential-carousel-v1");
    const stage = root?.querySelector(".credential-carousel-stage");
    const previous = root?.querySelector('button[aria-label="Previous credential"]');
    const next = root?.querySelector('button[aria-label="Next credential"]');
    if (!root || !stage || !previous || !next) {
      delete document.documentElement.dataset.m3ezSwipeNav;
      requestAnimationFrame(enhance);
      return;
    }

    stage.style.touchAction = "pan-y";
    stage.style.cursor = "grab";
    stage.style.willChange = "transform";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let suppressClick = false;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function resetStage() {
      stage.style.transition = reducedMotion.matches ? "none" : "transform 160ms ease";
      stage.style.transform = "translate3d(0,0,0)";
      stage.style.cursor = "grab";
      stage.style.userSelect = "";
    }

    function finish(event, cancelled = false) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const shouldMove = !cancelled && horizontal && Math.abs(dx) >= SWIPE_THRESHOLD;

      if (stage.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId);
      pointerId = null;
      resetStage();

      if (shouldMove) {
        suppressClick = true;
        (dx < 0 ? next : previous).click();
        window.setTimeout(() => { suppressClick = false; }, 0);
      }

      root.dispatchEvent(new Event("mouseleave"));
      dragging = false;
    }

    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragging = false;
      stage.style.transition = "none";
      stage.style.cursor = "grabbing";
      stage.style.userSelect = "none";
      stage.setPointerCapture?.(pointerId);
      root.dispatchEvent(new Event("mouseenter"));
    });

    stage.addEventListener("pointermove", (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 6) return;
      dragging = true;
      event.preventDefault();
      const offset = Math.max(-90, Math.min(90, dx * 0.35));
      stage.style.transform = `translate3d(${offset}px,0,0)`;
    });

    stage.addEventListener("pointerup", (event) => finish(event));
    stage.addEventListener("pointercancel", (event) => finish(event, true));
    stage.addEventListener("dragstart", (event) => event.preventDefault());
    stage.addEventListener("click", (event) => {
      if (!suppressClick && !dragging) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      dragging = false;
    }, true);
  }

  const start = () => requestAnimationFrame(() => requestAnimationFrame(enhance));
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();