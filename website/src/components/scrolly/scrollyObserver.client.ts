const steps = document.querySelectorAll<HTMLElement>('.scrolly-step[data-chart-id]');
const panes = document.querySelectorAll<HTMLElement>('.viz-pane[data-chart-id]');

function setActiveChart(chartId: string): void {
  panes.forEach((pane) => {
    pane.hidden = pane.dataset.chartId !== chartId;
  });
  window.dispatchEvent(new CustomEvent('scrolly:activate', { detail: { chartId } }));
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const step = entry.target as HTMLElement;
      const chartId = step.dataset.chartId;
      if (!chartId) continue;

      steps.forEach((s) => s.classList.toggle('is-active', s === step));
      setActiveChart(chartId);
    }
  },
  { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' },
);

steps.forEach((step) => observer.observe(step));
