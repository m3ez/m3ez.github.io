const RAILS_ID = 'm3ez-side-rails-v1';
const STYLE_ID = 'm3ez-side-rails-style-v1';
const WIDE_VIEWPORT = '(min-width: 1440px) and (min-height: 640px)';
const SECTIONS = [
  ['top', 'Intro'],
  ['research', 'Research'],
  ['credentials', 'Credentials'],
  ['consulting', 'Consulting'],
  ['contact', 'Contact'],
];

// The enhancement owns its styles, like the existing carousel. Nothing changes
// the content width, Hero/Method adjacency, or floating theme/back-to-top controls.
const CSS = `
#${RAILS_ID} {
  display: none;
  position: fixed;
  inset: 16px 28px;
  z-index: 10;
  pointer-events: none;
  color: var(--muted);
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
#${RAILS_ID} .side-rail-left,
#${RAILS_ID} .side-rail-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: calc((100vw - var(--max, 72rem)) / 2 - 48px);
}
#${RAILS_ID} .side-rail-left { left: 0; }
#${RAILS_ID} .side-rail-right { right: 0; }
#${RAILS_ID} .side-rail-frame {
  position: absolute;
  inset: 0;
  border-inline: 1px solid var(--line);
  opacity: .55;
}
#${RAILS_ID} .side-rail-frame::before,
#${RAILS_ID} .side-rail-frame::after {
  content: "";
  position: absolute;
  left: 24px;
  width: 16px;
  height: 1px;
  background: var(--muted);
}
#${RAILS_ID} .side-rail-frame::before { top: 40px; }
#${RAILS_ID} .side-rail-frame::after { bottom: 40px; }
#${RAILS_ID} .side-rail-right .side-rail-frame::before,
#${RAILS_ID} .side-rail-right .side-rail-frame::after {
  left: auto;
  right: 24px;
}
#${RAILS_ID} .side-rail-quote {
  position: absolute;
  top: 50%;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0;
  writing-mode: vertical-rl;
  transform: translateY(-50%) rotate(180deg);
  white-space: nowrap;
  letter-spacing: .03em;
}
#${RAILS_ID} .side-rail-quote::before,
#${RAILS_ID} .side-rail-quote::after {
  content: "";
  width: 1px;
  height: 16px;
  background: currentColor;
}
#${RAILS_ID} nav {
  position: absolute;
  top: clamp(5rem, 16vh, 10rem);
  right: 4px;
  width: 44px;
  pointer-events: auto;
}
#${RAILS_ID} .side-rail-links {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: clamp(220px, 34vh, 320px);
}
#${RAILS_ID} .side-rail-links::before,
#${RAILS_ID} .side-rail-progress {
  position: absolute;
  top: 22px;
  bottom: 22px;
  left: calc(50% - .5px);
  width: 1px;
  pointer-events: none;
}
#${RAILS_ID} .side-rail-links::before {
  content: "";
  background: var(--line);
}
#${RAILS_ID} .side-rail-progress {
  background: var(--muted);
  transform: scaleY(0);
  transform-origin: top;
}
#${RAILS_ID} a {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  color: var(--muted);
  text-decoration: none;
}
#${RAILS_ID} a::before {
  content: "";
  width: 7px;
  height: 7px;
  border: 1px solid currentColor;
  background: var(--paper);
}
#${RAILS_ID} a[aria-current="location"]::before,
#${RAILS_ID} a:hover::before,
#${RAILS_ID} a:focus-visible::before {
  border-color: var(--black);
  background: var(--black);
}
#${RAILS_ID} a:focus-visible {
  outline: 2px solid var(--black);
  outline-offset: 2px;
}
#${RAILS_ID} .side-rail-current {
  margin: 18px auto 0;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  letter-spacing: .06em;
  font-size: 11px;
  pointer-events: none;
}
@media screen and ${WIDE_VIEWPORT} {
  #${RAILS_ID} { display: block; }
}
@media print {
  #${RAILS_ID} { display: none !important; }
}
`;

export function initializeSideRails() {
  const main = document.getElementById('content');
  if (!main || !document.getElementById('top') || document.getElementById(RAILS_ID)) return;

  const sections = SECTIONS.map(([id, label]) => ({ id, label, node: document.getElementById(id) }))
    .filter(section => section.node);
  if (sections.length < 2) return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const rails = document.createElement('div');
  rails.id = RAILS_ID;
  rails.innerHTML = `
    <aside class="side-rail-left" aria-label="Personal motto">
      <span class="side-rail-frame" aria-hidden="true"></span>
      <p class="side-rail-quote">Curiosity is a feature, not a bug.</p>
    </aside>
    <div class="side-rail-right">
      <span class="side-rail-frame" aria-hidden="true"></span>
      <nav aria-label="Page sections">
        <div class="side-rail-links"><span class="side-rail-progress" aria-hidden="true"></span></div>
        <p class="side-rail-current" aria-hidden="true"></p>
      </nav>
    </div>`;

  const linksRoot = rails.querySelector('.side-rail-links');
  const links = sections.map(section => {
    const link = document.createElement('a');
    link.href = `#${section.id}`;
    link.setAttribute('aria-label', section.label);
    link.title = section.label;
    linksRoot.appendChild(link);
    return link;
  });
  const current = rails.querySelector('.side-rail-current');
  const progress = rails.querySelector('.side-rail-progress');
  document.body.appendChild(rails);

  const viewport = window.matchMedia(WIDE_VIEWPORT);
  let frame = 0;
  let currentIndex = -1;

  function syncActiveSection() {
    frame = 0;
    if (!viewport.matches) return;

    const activationLine = Math.max(96, window.innerHeight * .3);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const atBottom = maxScroll > 0 && window.scrollY >= maxScroll - 2;
    let activeIndex = 0;
    sections.forEach((section, index) => {
      // Collapsed portfolio sections must not win because their empty rect is 0.
      if (!section.node.getClientRects().length) return;
      if (atBottom || section.node.getBoundingClientRect().top <= activationLine) activeIndex = index;
    });
    if (activeIndex === currentIndex) return;
    currentIndex = activeIndex;

    links.forEach((link, index) => {
      if (index === activeIndex) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    current.textContent = `${String(activeIndex + 1).padStart(2, '0')} — ${sections[activeIndex].label.toUpperCase()}`;
    progress.style.transform = `scaleY(${activeIndex / (sections.length - 1)})`;
  }

  function scheduleSync() {
    if (!viewport.matches || frame) return;
    frame = requestAnimationFrame(syncActiveSection);
  }

  // Native anchors reuse the disclosure module's capture handler and existing
  // reduced-motion-aware scrolling. No extra wheel, click or keyboard handlers.
  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync);
  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  viewport.addEventListener('change', scheduleSync);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleSync).observe(main);
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(scheduleSync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-portfolio-expanded'],
    });
  }
  syncActiveSection();
}
