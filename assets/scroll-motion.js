const REVEAL_SELECTOR = '#research, #recognition, #credentials, #method, #contact';
const PROGRESS_ID = 'm3ez-scroll-progress-v1';

export function initializeScrollMotion() {
  if (document.documentElement.dataset.m3ezScrollMotion === 'ready') return;
  document.documentElement.dataset.m3ezScrollMotion = 'ready';

  const sections = [...document.querySelectorAll(REVEAL_SELECTOR)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  for (const section of sections) section.classList.add('scroll-reveal');

  const revealAll = () => {
    for (const section of sections) section.classList.add('is-visible');
  };

  let observer = null;
  if (reducedMotion.matches || typeof IntersectionObserver === 'undefined') {
    revealAll();
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );
    for (const section of sections) observer.observe(section);
  }

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
    revealAll();
    observer?.disconnect();
  });
}
