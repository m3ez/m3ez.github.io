// The ordered HTML is the content; motion is a once-only decorative enhancement.
export function initializeMethodWorkflow() {
  const workflow = document.querySelector('#method .method-workflow');
  if (!workflow || workflow.dataset.methodInitialized) return;
  workflow.dataset.methodInitialized = 'true';

  const steps = [...workflow.children];
  const stepMs = 360;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer = null;
  let timer = 0;

  function complete() {
    window.clearTimeout(timer);
    timer = 0;
    workflow.dataset.flowState = 'complete';
    observer?.disconnect();
    reducedMotion.removeEventListener?.('change', onMotionChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', onResize);
  }

  function onMotionChange() {
    if (reducedMotion.matches) complete();
  }

  function onVisibilityChange() {
    if (document.hidden && workflow.dataset.flowState === 'running') complete();
  }

  function onResize() {
    if (workflow.dataset.flowState === 'running') complete();
  }

  // No JavaScript, unsupported observers, and reduced motion all retain the
  // completed, readable diagram without hiding any label or description.
  if (reducedMotion.matches || typeof IntersectionObserver === 'undefined') {
    complete();
    return;
  }

  steps.forEach((step, index) => {
    step.style.setProperty('--method-delay', `${index * stepMs}ms`);
  });
  workflow.dataset.flowState = 'waiting';
  reducedMotion.addEventListener?.('change', onMotionChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', onResize, { passive: true });

  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (workflow.dataset.flowState === 'waiting' && entry.isIntersecting && entry.intersectionRatio >= 0.2) {
        if (document.hidden) continue;
        workflow.dataset.flowState = 'running';
        timer = window.setTimeout(complete, steps.length * stepMs);
      } else if (workflow.dataset.flowState === 'running' && !entry.isIntersecting) {
        complete();
      }
    }
  }, { threshold: [0, 0.2] });
  observer.observe(workflow);
}
