import { initializeSideRails } from './side-rails.js';

const REVEAL_SELECTORS = [
  '#research > .section-heading',
  '#recognition > .section-heading',
  '#consulting > .section-heading',
  '#consulting > .privacy-note',
  '#consulting .capability-list > div',
  '#credentials > .section-heading',
  '#method > h2',
  '#method > .method-line',
  '#contact > .section-heading',
  '#contact > .contact-actions',
  '#contact > .references',
];

const STAGGER_SELECTORS = [
  '#research .research-stat',
  '#consulting .capability-list > div',
  '#credentials .credential-grid-item',
];

const PROGRESS_ID = 'm3ez-scroll-progress-v1';
const DESKTOP_SCROLL_MEDIA = '(pointer: fine) and (hover: hover)';

function initializeInertialScroll(reducedMotion) {
  const desktopInput = window.matchMedia(DESKTOP_SCROLL_MEDIA);
  let animationFrame = 0;
  let currentY = window.scrollY;
  let targetY = window.scrollY;

  const isEnabled = () => desktopInput.matches && !reducedMotion.matches;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function normalizeWheelDelta(event) {
    let delta = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= window.innerHeight;
    return Math.max(-240, Math.min(240, delta));
  }

  function canNestedScrollerConsume(target, delta) {
    let node = target instanceof Element ? target : null;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const scrollable = /(auto|scroll|overlay)/.test(style.overflowY);
      if (scrollable && node.scrollHeight > node.clientHeight + 1) {
        if (delta < 0 && node.scrollTop > 0) return true;
        if (
          delta > 0 &&
          node.scrollTop + node.clientHeight < node.scrollHeight - 1
        ) {
          return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function cancelInertia() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    currentY = window.scrollY;
    targetY = currentY;
  }

  function step() {
    currentY += (targetY - currentY) * 0.18;

    if (Math.abs(targetY - currentY) < 0.5) {
      currentY = targetY;
      window.scrollTo({ top: currentY, behavior: 'instant' });
      animationFrame = 0;
      return;
    }

    window.scrollTo({ top: currentY, behavior: 'instant' });
    animationFrame = requestAnimationFrame(step);
  }

  function onWheel(event) {
    if (!isEnabled()) return;
    if (event.ctrlKey || event.metaKey) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    const delta = normalizeWheelDelta(event);
    if (!delta || canNestedScrollerConsume(event.target, delta)) return;

    if (!animationFrame) {
      currentY = window.scrollY;
      targetY = currentY;
    }

    const nextTarget = Math.min(maxScroll(), Math.max(0, targetY + delta));
    if (nextTarget === targetY && !animationFrame) return;

    targetY = Math.min(maxScroll(), Math.max(0, targetY + delta));
    event.preventDefault();

    if (!animationFrame) animationFrame = requestAnimationFrame(step);
  }

  function syncMode() {
    const enabled = isEnabled();
    document.documentElement.dataset.m3ezInertialScroll = enabled
      ? 'ready'
      : 'native';
    if (!enabled) cancelInertia();
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', cancelInertia, { passive: true });
  window.addEventListener('pointerdown', cancelInertia, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (
      [
        'ArrowDown',
        'ArrowUp',
        'PageDown',
        'PageUp',
        'Home',
        'End',
        ' ',
      ].includes(event.key)
    ) {
      cancelInertia();
    }
  });

  desktopInput.addEventListener?.('change', syncMode);
  reducedMotion.addEventListener?.('change', syncMode);
  syncMode();
}

export function initializeScrollMotion() {
  if (document.documentElement.dataset.m3ezScrollMotion === 'ready') return;
  document.documentElement.dataset.m3ezScrollMotion = 'ready';
  initializeSideRails();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  initializeInertialScroll(reducedMotion);
  const registered = new WeakSet();
  const targets = new Set();

  let observer = null;
  if (!reducedMotion.matches && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px 0px 0px' },
    );
  }

  function registerTarget(target, delay = 0) {
    if (!target || registered.has(target)) return;
    registered.add(target);
    targets.add(target);
    target.classList.add('scroll-reveal-item');
    target.style.setProperty('--reveal-delay', `${delay}ms`);

    if (reducedMotion.matches || !observer) {
      target.classList.add('is-visible');
      return;
    }

    observer.observe(target);
  }

  function registerTargets() {
    for (const selector of REVEAL_SELECTORS) {
      for (const target of document.querySelectorAll(selector)) {
        registerTarget(target);
      }
    }

    for (const selector of STAGGER_SELECTORS) {
      [...document.querySelectorAll(selector)].forEach((target, index) => {
        registerTarget(target, Math.min(index * 25, 100));
      });
    }
  }

  registerTargets();

  const research = document.getElementById('research');
  if (
    research &&
    !research.querySelector('.research-stat') &&
    typeof MutationObserver !== 'undefined'
  ) {
    const mutationObserver = new MutationObserver(() => {
      registerTargets();
      if (research.querySelector('.research-stat')) mutationObserver.disconnect();
    });
    mutationObserver.observe(research, { childList: true, subtree: true });
  }

  const revealAll = () => {
    for (const target of targets) target.classList.add('is-visible');
  };

  const progress = document.createElement('div');
  progress.id = PROGRESS_ID;
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  let ticking = false;
  function syncProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0
      ? Math.min(1, Math.max(0, window.scrollY / maxScroll))
      : 0;
    progress.style.transform = `scaleX(${ratio})`;
    ticking = false;
  }

  function scheduleProgress() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncProgress);
  }

  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress);
  syncProgress();

  reducedMotion.addEventListener?.('change', (event) => {
    if (!event.matches) return;
    registerTargets();
    revealAll();
    observer?.disconnect();
  });
}
