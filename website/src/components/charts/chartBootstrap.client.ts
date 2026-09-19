import type { ChartConfig } from '../../charts/types';
import type { Lang } from '../../i18n/ui';
import { renderChart } from './render';

// Keyed by the canvas element itself, not by chartId: the same chart can
// have two independent mounts on the page at once (the shared desktop
// .viz-pane and a section's own .viz-inline copy for mobile — see
// global.css), each needing its own render call.
const rendered = new WeakSet<Element>();

function readConfig(pane: HTMLElement): ChartConfig | null {
  const script = pane.querySelector<HTMLScriptElement>('script[data-chart-config]');
  if (!script?.textContent) return null;
  try {
    return JSON.parse(script.textContent) as ChartConfig;
  } catch {
    return null;
  }
}

function activatePane(pane: HTMLElement): void {
  const canvas = pane.querySelector<HTMLElement>('[data-chart-canvas]');
  if (!canvas || rendered.has(canvas)) return;

  const config = readConfig(pane);
  if (!config) return;

  const lang = (document.documentElement.lang as Lang) || 'pt';
  renderChart(canvas, config, lang);
  rendered.add(canvas);
}

window.addEventListener('scrolly:activate', (event) => {
  const { chartId } = (event as CustomEvent<{ chartId: string }>).detail;
  const pane = document.querySelector<HTMLElement>(`.viz-pane[data-chart-id="${CSS.escape(chartId)}"]`);
  if (pane) activatePane(pane);
});

// Desktop: the shared column's first pane should render immediately,
// before any scroll happens.
const firstPane = document.querySelector<HTMLElement>('.viz-pane[data-chart-id]:not([hidden])');
if (firstPane) activatePane(firstPane);

// Mobile: each section's own inline chart has no shared slot to wait its
// turn for — it renders as soon as the page loads, right where it sits.
document.querySelectorAll<HTMLElement>('.viz-inline[data-chart-id]').forEach(activatePane);
