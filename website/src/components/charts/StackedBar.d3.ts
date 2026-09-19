import * as d3 from 'd3';
import type { StackedBarChartConfig } from '../../charts/types';

interface SeriesLabels {
  [key: string]: string;
}

interface RenderOptions {
  seriesLabels: SeriesLabels;
  yAxisLabel: string;
}

const SERIES_COLOR_VAR: Record<string, string> = {
  passenger: '--series-passenger',
  driver: '--series-driver',
  unlabeled: '--series-unlabeled',
};

function niceMax(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function renderStackedBar(
  container: HTMLElement,
  config: StackedBarChartConfig,
  options: RenderOptions,
): void {
  container.innerHTML = '';

  const width = container.clientWidth || 480;
  const height = 420;
  const margin = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const byCategory = d3.group(config.data, (d) => d.category);
  const totals = config.categories.map((category) => {
    const rows = byCategory.get(category) ?? [];
    return d3.sum(rows, (d) => d.value);
  });
  const yMax = niceMax(d3.max(totals) ?? 0);

  const x = d3
    .scaleBand()
    .domain(config.categories)
    .range([0, innerWidth])
    .paddingInner(0.35)
    .paddingOuter(0.2);

  const barWidth = Math.min(x.bandwidth(), 24);

  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    // "group", not "img": each bar segment below is its own focusable,
    // individually labeled element. role="img" on the root would flatten
    // the whole subtree into one presentational image for assistive tech,
    // hiding the per-segment aria-labels from screen readers.
    .attr('role', 'group')
    .attr('aria-label', options.yAxisLabel);

  const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Gridlines (hairline, recessive, behind bars).
  const yTicks = y.ticks(5);
  root
    .append('g')
    .attr('class', 'gridlines')
    .selectAll('line')
    .data(yTicks)
    .join('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', (d) => y(d))
    .attr('y2', (d) => y(d))
    .attr('stroke', 'var(--gridline)')
    .attr('stroke-width', 1);

  // Y axis ticks (muted ink, no axis line domain path).
  root
    .append('g')
    .selectAll('text')
    .data(yTicks)
    .join('text')
    .attr('x', -10)
    .attr('y', (d) => y(d))
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('fill', 'var(--text-muted)')
    .attr('font-size', 11)
    .text((d) => d3.format(',')(d));

  // Baseline.
  root
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', innerHeight)
    .attr('y2', innerHeight)
    .attr('stroke', 'var(--baseline)')
    .attr('stroke-width', 1);

  const tooltip = ensureTooltip();

  const GAP = 2;

  for (const category of config.categories) {
    const rows = (byCategory.get(category) ?? []).slice();
    rows.sort((a, b) => config.stackKeys.indexOf(a.key) - config.stackKeys.indexOf(b.key));

    let cumulative = 0;
    const cx = (x(category) ?? 0) + (x.bandwidth() - barWidth) / 2;
    const topKey = config.stackKeys[config.stackKeys.length - 1];

    rows.forEach((row) => {
      const y0 = y(cumulative);
      const y1 = y(cumulative + row.value);
      cumulative += row.value;

      const segTop = y1 + (row.key === topKey ? 0 : GAP / 2);
      const segBottom = y0 - (row.key === config.stackKeys[0] ? 0 : GAP / 2);
      const segHeight = Math.max(segBottom - segTop, 0);

      const color = `var(${SERIES_COLOR_VAR[row.key]})`;
      const isTop = row.key === topKey;
      const seriesLabel = options.seriesLabels[row.key] ?? row.key;
      const ariaLabel = `${category}: ${seriesLabel}, ${d3.format(',')(row.value)}`;

      const group = root.append('g').attr('tabindex', 0).attr('role', 'img').attr('aria-label', ariaLabel);

      if (isTop && segHeight > 0) {
        const r = 4;
        const path = roundedTopRectPath(cx, segTop, barWidth, segHeight, r);
        group.append('path').attr('d', path).attr('fill', color);
      } else {
        group
          .append('rect')
          .attr('x', cx)
          .attr('y', segTop)
          .attr('width', barWidth)
          .attr('height', segHeight)
          .attr('fill', color);
      }

      group
        .append('rect')
        .attr('x', cx)
        .attr('y', segTop)
        .attr('width', barWidth)
        .attr('height', segHeight)
        .attr('fill', 'transparent')
        .on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
          showTooltip(tooltip, event, options.seriesLabels[row.key] ?? row.key, category, row.value);
        })
        .on('pointerleave blur', () => hideTooltip(tooltip));
    });

    root
      .append('text')
      .attr('x', cx + barWidth / 2)
      .attr('y', innerHeight + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-muted)')
      .attr('font-size', 11)
      .text(category);
  }
}

function roundedTopRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h}
    L${x},${y + radius}
    Q${x},${y} ${x + radius},${y}
    L${x + w - radius},${y}
    Q${x + w},${y} ${x + w},${y + radius}
    L${x + w},${y + h}
    Z`;
}

function ensureTooltip(): HTMLDivElement {
  let el = document.querySelector<HTMLDivElement>('.viz-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.className = 'viz-tooltip';
    document.body.appendChild(el);
  }
  return el;
}

function showTooltip(tooltip: HTMLDivElement, event: PointerEvent | FocusEvent, seriesLabel: string, category: string, value: number) {
  tooltip.innerHTML = '';
  const valueEl = document.createElement('div');
  valueEl.className = 'tooltip-value';
  valueEl.textContent = d3.format(',')(value);
  const labelEl = document.createElement('div');
  labelEl.className = 'tooltip-label';
  labelEl.textContent = `${seriesLabel} · ${category}`;
  tooltip.append(valueEl, labelEl);
  tooltip.classList.add('is-visible');

  const point = 'clientX' in event ? event : null;
  if (point) {
    tooltip.style.left = `${point.clientX + 12}px`;
    tooltip.style.top = `${point.clientY + 12}px`;
  }
}

function hideTooltip(tooltip: HTMLDivElement) {
  tooltip.classList.remove('is-visible');
}
