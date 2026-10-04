const HINT_ID = 'm3ez-explore-more-v1';
const READY_MARKER = 'ready';
const EXPANDED = 'true';
const COLLAPSED = 'false';

function decodeHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function initializeProgressiveDisclosure() {
  const root = document.documentElement;
  if (root.dataset.m3ezProgressiveDisclosure === READY_MARKER) return;

  const main = document.getElementById('content');
  const method = document.getElementById('method');
  const hero = document.getElementById('top');
  if (!main || !method || !hero) {
    root.dataset.portfolioExpanded = EXPANDED;
    return;
  }

  const mainChildren = [...main.children];
  const methodIndex = mainChildren.indexOf(method);
  const extendedRoots = methodIndex >= 0 ? mainChildren.slice(methodIndex + 1) : [];
  if (!extendedRoots.length) {
    root.dataset.portfolioExpanded = EXPANDED;
    return;
  }

  root.dataset.m3ezProgressiveDisclosure = READY_MARKER;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Matches the mobile landing and sky breakpoint in portfolio-theme.css.
  const mobileLayout = window.matchMedia('(max-width: 760px)');

  const targetFromHash = hash => {
    const id = decodeHash(hash);
    return id ? document.getElementById(id) : null;
  };

  const isExtendedTarget = target =>
    target instanceof Element &&
    ((mobileLayout.matches && (target === method || method.contains(target))) ||
      extendedRoots.some(section => section === target || section.contains(target)));

  function expand({ animate = true } = {}) {
    if (root.dataset.portfolioExpanded === EXPANDED) return;
    root.dataset.portfolioExpanded = EXPANDED;

    if (animate && !reducedMotion.matches) {
      root.dataset.portfolioReveal = 'active';
      window.setTimeout(() => {
        if (root.dataset.portfolioReveal === 'active') {
          root.dataset.portfolioReveal = 'complete';
        }
      }, 620);
    } else {
      root.dataset.portfolioReveal = 'complete';
    }
  }

  const initialTarget = targetFromHash(window.location.hash);
  if (isExtendedTarget(initialTarget)) {
    expand({ animate: false });
  } else if (root.dataset.portfolioExpanded !== EXPANDED) {
    root.dataset.portfolioExpanded = COLLAPSED;
  }

  let hint = document.getElementById(HINT_ID);
  if (!hint) {
    hint = document.createElement('a');
    hint.id = HINT_ID;
    hint.setAttribute('aria-label', 'Explore the full portfolio');
    hint.innerHTML = '<span>Explore more</span><span class="m3ez-explore-arrow" aria-hidden="true">↓</span>';
  }

  function placeHint() {
    // Move the same link; do not insert a sibling between Hero and Method,
    // because the celestial/walker scene uses their adjacent-sibling selector.
    const parent = mobileLayout.matches ? hero : method;
    hint.href = mobileLayout.matches ? '#method' : '#research';
    if (hint.parentElement !== parent) parent.appendChild(hint);
  }
  placeHint();
  mobileLayout.addEventListener('change', () => {
    placeHint();
    // Resizing must not hide an active deep link or a keyboard-focused target.
    // Once expanded, the portfolio never collapses on orientation changes.
    if (isExtendedTarget(targetFromHash(window.location.hash)) || isExtendedTarget(document.activeElement)) {
      expand({ animate: false });
    }
  });

  document.addEventListener('click', event => {
    const anchor = event.target instanceof Element
      ? event.target.closest('a[href^="#"]')
      : null;
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    const target = targetFromHash(href);
    if (isExtendedTarget(target)) expand({ animate: true });
  }, true);

  window.addEventListener('hashchange', () => {
    if (isExtendedTarget(targetFromHash(window.location.hash))) {
      expand({ animate: true });
    }
  });
}
