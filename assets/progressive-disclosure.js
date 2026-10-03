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
  if (!main || !method) {
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

  const targetFromHash = hash => {
    const id = decodeHash(hash);
    return id ? document.getElementById(id) : null;
  };

  const isExtendedTarget = target =>
    target instanceof Element &&
    extendedRoots.some(section => section === target || section.contains(target));

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

  if (!document.getElementById(HINT_ID)) {
    const hint = document.createElement('a');
    hint.id = HINT_ID;
    hint.href = '#research';
    hint.setAttribute('aria-label', 'Explore the full portfolio');
    hint.innerHTML = '<span>Explore more</span><span class="m3ez-explore-arrow" aria-hidden="true">↓</span>';
    method.appendChild(hint);
  }

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
