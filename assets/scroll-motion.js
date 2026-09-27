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

export function initializeScrollMotion() {
  if (document.documentElement.dataset.m3ezScrollMotion === 'ready') return;
  document.documentElement.dataset.m3ezScrollMotion = 'ready';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
      { threshold: 0.01, rootMargin: '0px 0px 15% 0px' },
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
        registerTarget(target, Math.min(index * 15, 60));
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
