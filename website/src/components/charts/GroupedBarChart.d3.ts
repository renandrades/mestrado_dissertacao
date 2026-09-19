import * as d3 from 'd3';
import type { GroupedBarChartConfig, GroupedBarDatum } from '../../charts/types';

interface RenderOptions {
  /** Display label per group key, e.g. { gat: 'GAT' }. */
  groupLabels: Record<string, string>;
  /** e.g. "AUC-PR" — combined into the root's aria-label; see below. */
  yAxisLabel: string;
  /** Chart title, combined with yAxisLabel into the root's aria-label. */
  title: string;
}

const MIN_PANEL_WIDTH = 140;
const PANEL_GAP = 12;
const PANEL_HEIGHT = 300;
const MARGIN = { top: 10, right: 8, bottom: 66, left: 34 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Formats a value generically: integers (e.g. gene counts) get thousands
 * separators, fractional values (e.g. AUC-PR) get up to `digits` decimals
 * with trailing zeros trimmed — this component doesn't assume one unit. */
function formatValue(value: number, digits = 3): string {
  return Number.isInteger(value) ? d3.format(',')(value) : d3.format(`,.${digits}~f`)(value);
}

function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return `${label.slice(0, Math.max(1, maxChars - 1))}…`;
}

/** Same rounded-top rectangle shape used by StackedBar.d3.ts, duplicated
 * here since it isn't exported from that module. */
function roundedTopRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, h, w / 2);
  if (radius <= 0 || h <= 0) return `M${x},${y} h${w} v${h} h${-w} Z`;
  return `M${x},${y + h}
    L${x},${y + radius}
    Q${x},${y} ${x + radius},${y}
    L${x + w - radius},${y}
    Q${x + w},${y} ${x + w},${y + radius}
    L${x + w},${y + h}
    Z`;
}

/**
 * Renders a generic faceted grouped-bar chart: one panel per `config.facet`
 * (small multiples), each showing `config.groups` side-by-side bars across
 * `config.categories`, all panels sharing one y-scale so magnitudes stay
 * comparable across facets. Facet/group/category counts are driven purely
 * by the config's arrays — nothing about a specific dataset is hardcoded.
 */
export function renderGroupedBar(
  container: HTMLElement,
  config: GroupedBarChartConfig,
  options: RenderOptions,
): void {
  container.innerHTML = '';

  const facets = config.facets.length > 0 ? config.facets : [''];
  const showFacetTitles = config.facets.length > 1;

  const totalWidth = container.clientWidth || 480;
  const columns = Math.max(
    1,
    Math.min(facets.length, Math.floor((totalWidth + PANEL_GAP) / (MIN_PANEL_WIDTH + PANEL_GAP))),
  );
  const panelWidth = Math.max(
    MIN_PANEL_WIDTH,
    Math.floor((totalWidth - PANEL_GAP * (columns - 1)) / columns),
  );

  const innerWidth = panelWidth - MARGIN.left - MARGIN.right;
  const innerHeight = PANEL_HEIGHT - MARGIN.top - MARGIN.bottom;

  // Shared x-scales: identical categories/innerWidth on every panel, so bar
  // positions line up column-for-column across facets.
  const x0 = d3
    .scaleBand<string>()
    .domain(config.categories)
    .range([0, innerWidth])
    .paddingInner(0.35)
    .paddingOuter(0.15);
  const x1 = d3.scaleBand<string>().domain(config.groups).range([0, x0.bandwidth()]).padding(0.12);
  const barWidth = Math.min(x1.bandwidth(), 30);
  const maxCategoryChars = Math.max(6, Math.round(x0.bandwidth() / 4.2));

  // Shared y-scale: one "nice" rounded max across ALL panels' data, so bar
  // heights are visually comparable between facets, not independently
  // rescaled per panel.
  const globalMax = d3.max(config.data, (d) => d.value) ?? 0;
  const yMax = niceMax(globalMax);
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);
  const yTicks = y.ticks(5);

  // Root: "group", not "img" — every bar below is its own focusable,
  // individually labeled element. role="img" here would flatten the whole
  // subtree into one presentational image for assistive tech, hiding the
  // per-bar aria-labels (see StackedBar.d3.ts / NetworkGraph.d3.ts for the
  // same reasoning already established in this codebase).
  const wrapper = d3
    .select(container)
    .append('div')
    .attr('role', 'group')
    .attr('aria-label', `${options.title} — ${options.yAxisLabel}`)
    .style('display', 'grid')
    .style('grid-template-columns', `repeat(${columns}, minmax(${MIN_PANEL_WIDTH}px, 1fr))`)
    .style('gap', '1.25rem 0.75rem');

  const tooltip = ensureTooltip();

  facets.forEach((facet, facetIndex) => {
    const panel = wrapper.append('div');

    if (showFacetTitles) {
      panel
        .append('div')
        .style('text-align', 'center')
        .style('font-size', '0.85rem')
        .style('font-weight', '600')
        .style('color', 'var(--text-secondary)')
        .style('margin-bottom', '0.35rem')
        .text(facet);
    }

    const svg = panel
      .append('svg')
      .attr('viewBox', `0 0 ${panelWidth} ${PANEL_HEIGHT}`)
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Gridlines (hairline, recessive, behind bars) — drawn from the shared
    // y-scale in every panel, so tick positions align across facets.
    root
      .append('g')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', 'var(--gridline)')
      .attr('stroke-width', 1);

    // Y-axis ticks: only on the first panel of each row, to avoid repeating
    // the same shared scale's numbers in every panel.
    if (facetIndex % columns === 0) {
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
        .attr('font-size', 10)
        .text((d) => formatValue(d, 2));
    }

    // Baseline.
    root
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', innerHeight)
      .attr('y2', innerHeight)
      .attr('stroke', 'var(--baseline)')
      .attr('stroke-width', 1);

    // Category (x-axis) labels: rotated so longer category names (e.g.
    // strategy names) stay legible instead of overlapping. Visually
    // truncated when they don't fit the available band width, but the full
    // text is always reachable: a native <title> gives a hover tooltip on
    // the label itself, and every bar's own aria-label/tooltip below always
    // carries the untruncated category text too.
    const categoryLabels = root
      .append('g')
      .selectAll('text')
      .data(config.categories)
      .join('text')
      .attr(
        'transform',
        (category) => `translate(${(x0(category) ?? 0) + x0.bandwidth() / 2},${innerHeight + 10}) rotate(-32)`,
      )
      .attr('text-anchor', 'end')
      .attr('fill', 'var(--text-muted)')
      .attr('font-size', 10)
      .text((category) => truncateLabel(category, maxCategoryChars));

    categoryLabels.append('title').text((category) => category);

    const rowsByCategory = d3.group(
      config.data.filter((d) => d.facet === facet),
      (d) => d.category,
    );

    for (const category of config.categories) {
      const rows = rowsByCategory.get(category) ?? [];

      for (const group of config.groups) {
        const datum: GroupedBarDatum | undefined = rows.find((d) => d.group === group);
        if (!datum) continue;

        const groupLabel = options.groupLabels[group] ?? group;
        const cx = (x0(category) ?? 0) + (x1(group) ?? 0) + (x1.bandwidth() - barWidth) / 2;
        const barTop = y(datum.value);
        const barHeight = Math.max(innerHeight - barTop, 0);
        const color = `var(--series-${group})`;
        const ariaLabel = `${facet} · ${category} · ${groupLabel}: ${formatValue(datum.value)}`;

        const barGroup = root.append('g').attr('tabindex', 0).attr('role', 'img').attr('aria-label', ariaLabel);

        barGroup
          .append('path')
          .attr('d', roundedTopRectPath(cx, barTop, barWidth, barHeight, 3))
          .attr('fill', color);

        barGroup
          .append('rect')
          .attr('x', cx)
          .attr('y', barTop)
          .attr('width', barWidth)
          .attr('height', barHeight)
          .attr('fill', 'transparent')
          .on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
            showTooltip(tooltip, event, groupLabel, category, facets.length > 1 ? facet : null, datum.value);
          })
          .on('pointerleave blur', () => hideTooltip(tooltip));
      }
    }
  });
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

function showTooltip(
  tooltip: HTMLDivElement,
  event: PointerEvent | FocusEvent,
  groupLabel: string,
  category: string,
  facet: string | null,
  value: number,
) {
  tooltip.innerHTML = '';
  const valueEl = document.createElement('div');
  valueEl.className = 'tooltip-value';
  valueEl.textContent = formatValue(value);
  const labelEl = document.createElement('div');
  labelEl.className = 'tooltip-label';
  labelEl.textContent = facet ? `${groupLabel} · ${category} · ${facet}` : `${groupLabel} · ${category}`;
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
