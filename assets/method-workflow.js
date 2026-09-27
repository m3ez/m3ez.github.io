// Semantic HTML stays readable; strip highlights loop only while visible.
export function initializeMethodWorkflow() {
  const workflow = document.querySelector('#method .method-workflow');
  if (!workflow || workflow.dataset.methodInitialized) return;
  workflow.dataset.methodInitialized = 'true';

  const steps = [...workflow.querySelectorAll('.method-node')];
  const stepMs = 600;
  const restMs = 800; // Let the Report endpoint rest before the next pass.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;

  // Unsupported observers retain the fully drawn static diagram.
  if (steps.length < 2 || typeof IntersectionObserver === 'undefined') {
    workflow.dataset.flowState = 'complete';
    return;
  }

  workflow.style.setProperty('--method-cycle', `${steps.length * stepMs + restMs}ms`);
  steps.forEach((step, index) => {
    step.style.setProperty('--method-delay', `${index * stepMs}ms`);
  });

  function sync() {
    const state = reducedMotion.matches
      ? 'complete'
      : inView && !document.hidden ? 'running' : 'waiting';
    if (workflow.dataset.flowState !== state) workflow.dataset.flowState = state;
  }

  // Keep these subscriptions: re-entry and live preference changes may resume
  // the loop. CSS owns the repetition; no interval or completion timer runs.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      sync();
    }
  }, { threshold: [0, 0.2] });
  reducedMotion.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  observer.observe(workflow);
  sync();
}
