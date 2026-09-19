import * as d3 from 'd3';
import type { CentralityLiftGroup, DumbbellChartConfig } from '../../charts/types';

type LabelMap = Record<string, string>;

export interface DumbbellRenderOptions {
  /** Chart title, used as the root SVG's aria-label. */
  title: string;
  /** Display label per group key, e.g. { gat: 'GAT', gcn: 'GCN', graphsage: 'GraphSAGE' }. */
  groupLabels: LabelMap;
  /** Caption for the "before" state (Multi-Omics only), e.g. "Multi-ômicos". */
  beforeLabel: string;
  /** Caption for the "after" state (Multi-Omics + Centrality), e.g. "Multi-ômicos + centralidades". */
  afterLabel: string;
  /** Shared value-axis caption, e.g. "AUC-PR". */
  valueAxisLabel: string;
  /**
   * Builds the full aria-label / tooltip text for one dumbbell from
   * already-formatted values. Passed in (rather than composed here) so
   * PT/EN phrase order and wording can differ freely, e.g.:
   *   (facet, group, before, after) =>
   *     `${facet}, ${group}: ${before} multi-omics, ${after} multi-omics + centralities`
   */
  formatAriaLabel: (facet: string, groupLabel: string, beforeText: string, afterText: string) => string;
}

const GROUP_COLOR_VAR: Record<CentralityLiftGroup, string> = {
  gat: '--series-gat',
  gcn: '--series-gcn',
  graphsage: '--series-graphsage',
};

const VALUE_FORMAT = d3.format('.3f');
const TICK_FORMAT = d3.format('.2f');

/**
 * Renders the RQ1/RQ2 "centrality lift" small multiples: one panel per PPI
 * network (facet), each holding one horizontal dumbbell per GNN algorithm
 * (group) — a thin line from the Multi-Omics-only AUC-PR ("before") to the
 * Multi-Omics + Centrality AUC-PR ("after") on a shared 0..max scale, with
 * a muted hollow dot at "before" and a filled, larger dot at "after" (the
 * improvement is the story, so "after" reads as the emphasized state).
 *
 * Deliberately has no arrowhead or other "always increases" visual
 * language: IREF's GCN result is a real, intentional exception (AUC-PR
 * slightly *decreases* after adding centrality features) and must render
 * faithfully like any other dumbbell, not as a special/error case.
 */
export function renderDumbbell(
  container: HTMLElement,
  config: DumbbellChartConfig,
  options: DumbbellRenderOptions,
): void {
  container.innerHTML = '';

  const width = container.clientWidth || 480;
  const margin = { top: 52, right: 24, bottom: 40, left: 96 };
  const rowHeight = 30;
  const titleHeight = 22;
  const panelGap = 16;

  const rowsPerPanel = config.groups.length;
  const panelHeight = titleHeight + rowsPerPanel * rowHeight;
  const innerWidth = Math.max(width - margin.left - margin.right, 40);
  const innerHeight = config.facets.length * panelHeight + (config.facets.length - 1) * panelGap;
  const height = margin.top + innerHeight + margin.bottom;

  const maxValue = d3.max(config.data, (d) => Math.max(d.before, d.after)) ?? 0;
  const x = d3.scaleLinear().domain([0, maxValue]).nice().range([0, innerWidth]);
  const xTicks = x.ticks(5);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    // "group", not "img": each dumbbell below is its own focusable,
    // individually labeled leaf mark. role="img" on the root would flatten
    // the whole subtree into one presentational image for assistive tech,
    // hiding the per-dumbbell aria-labels from screen readers.
    .attr('role', 'group')
    .attr('aria-label', options.title);

  // Shape key: "before" (hollow, muted outline) vs "after" (filled) dots
  // are a second encoding independent of algorithm color, so they need
  // their own caption — the color legend (per-algorithm) is rendered
  // separately, outside this chart, from config.legendKeys.
  const keyBefore = svg.append('g').attr('transform', `translate(${margin.left}, 14)`);
  keyBefore
    .append('circle')
    .attr('cx', 5)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('fill', 'var(--surface-1)')
    .attr('stroke', 'var(--text-muted)')
    .attr('stroke-width', 2);
  keyBefore
    .append('text')
    .attr('x', 16)
    .attr('y', 0)
    .attr('dy', '0.32em')
    .attr('fill', 'var(--text-secondary)')
    .attr('font-size', 11)
    .text(options.beforeLabel);

  const keyAfter = svg.append('g').attr('transform', `translate(${margin.left}, 32)`);
  keyAfter
    .append('circle')
    .attr('cx', 5)
    .attr('cy', 0)
    .attr('r', 5.5)
    .attr('fill', 'var(--text-muted)');
  keyAfter
    .append('text')
    .attr('x', 16)
    .attr('y', 0)
    .attr('dy', '0.32em')
    .attr('fill', 'var(--text-secondary)')
    .attr('font-size', 11)
    .text(options.afterLabel);

  const tooltip = ensureTooltip();

  config.facets.forEach((facet, facetIndex) => {
    const panelY = margin.top + facetIndex * (panelHeight + panelGap);
    const panel = svg.append('g').attr('transform', `translate(${margin.left}, ${panelY})`);

    panel
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.32em')
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', 12)
      .attr('font-weight', 700)
      .text(facet);

    const rowsTop = titleHeight;
    const rowsHeight = rowsPerPanel * rowHeight;

    // Gridlines (hairline, recessive, behind the dumbbells), aligned to the
    // shared x scale so panels stay comparable at a glance.
    panel
      .append('g')
      .selectAll('line')
      .data(xTicks)
      .join('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', rowsTop)
      .attr('y2', rowsTop + rowsHeight)
      .attr('stroke', 'var(--gridline)')
      .attr('stroke-width', 1);

    // Baseline at x = 0.
    panel
      .append('line')
      .attr('x1', x(0))
      .attr('x2', x(0))
      .attr('y1', rowsTop)
      .attr('y2', rowsTop + rowsHeight)
      .attr('stroke', 'var(--baseline)')
      .attr('stroke-width', 1);

    config.groups.forEach((group, groupIndex) => {
      const datum = config.data.find((d) => d.facet === facet && d.group === group);
      if (!datum) return;

      const rowY = rowsTop + groupIndex * rowHeight + rowHeight / 2;
      const groupLabel = options.groupLabels[group] ?? group;
      const colorVar = GROUP_COLOR_VAR[group];

      panel
        .append('text')
        .attr('x', -10)
        .attr('y', rowY)
        .attr('dy', '0.32em')
        .attr('text-anchor', 'end')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', 11)
        .text(groupLabel);

      const xBefore = x(datum.before);
      const xAfter = x(datum.after);
      const beforeText = VALUE_FORMAT(datum.before);
      const afterText = VALUE_FORMAT(datum.after);
      const ariaLabel = options.formatAriaLabel(facet, groupLabel, beforeText, afterText);

      const g = panel
        .append('g')
        .attr('tabindex', 0)
        .attr('role', 'img')
        .attr('aria-label', ariaLabel)
        .style('cursor', 'pointer');

      // Generous transparent hit area (wider than the thin line + dots),
      // drawn first so visible marks sit on top of it.
      const hitLeft = Math.min(xBefore, xAfter) - 12;
      const hitWidth = Math.abs(xAfter - xBefore) + 24;
      g.append('rect')
        .attr('x', hitLeft)
        .attr('y', rowY - 14)
        .attr('width', hitWidth)
        .attr('height', 28)
        .attr('fill', 'transparent');

      g.append('line')
        .attr('class', 'dumbbell-line')
        .attr('x1', xBefore)
        .attr('x2', xAfter)
        .attr('y1', rowY)
        .attr('y2', rowY)
        .attr('stroke', `var(${colorVar})`)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');

      // "before": smaller, hollow/muted-outline dot — the de-emphasized state.
      g.append('circle')
        .attr('class', 'before-dot')
        .attr('cx', xBefore)
        .attr('cy', rowY)
        .attr('r', 5)
        .attr('fill', 'var(--surface-1)')
        .attr('stroke', `var(${colorVar})`)
        .attr('stroke-width', 2);

      // "after": filled, larger, more prominent dot — the emphasized
      // state, since the improvement (or, for IREF/GCN, the lack of one)
      // is the story. A surface-color ring keeps it legible where it
      // overlaps the line.
      g.append('circle')
        .attr('class', 'after-dot')
        .attr('cx', xAfter)
        .attr('cy', rowY)
        .attr('r', 7)
        .attr('fill', `var(${colorVar})`)
        .attr('stroke', 'var(--surface-1)')
        .attr('stroke-width', 1.5);

      // Direct label on the "after" value only (the endpoint the story is
      // about); flips side when it would otherwise run off the panel.
      const preferRight = innerWidth - xAfter > 34;
      g.append('text')
        .attr('x', xAfter + (preferRight ? 11 : -11))
        .attr('y', rowY)
        .attr('dy', '0.32em')
        .attr('text-anchor', preferRight ? 'start' : 'end')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', 10)
        .text(TICK_FORMAT(datum.after));

      g.on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
        g.select('.dumbbell-line').attr('stroke-width', 3);
        g.select('.after-dot').attr('r', 8.5);
        showTooltip(tooltip, event, facet, groupLabel, beforeText, afterText, options.beforeLabel, options.afterLabel);
      }).on('pointerleave blur', () => {
        g.select('.dumbbell-line').attr('stroke-width', 2);
        g.select('.after-dot').attr('r', 7);
        hideTooltip(tooltip);
      });
    });
  });

  // Shared bottom axis (the x scale is shared across every panel, so one
  // axis at the foot of the stack is enough — per-panel gridlines above
  // already carry the alignment).
  const axisY = margin.top + innerHeight + 16;
  const axis = svg.append('g').attr('transform', `translate(${margin.left}, ${axisY})`);
  axis
    .selectAll('text')
    .data(xTicks)
    .join('text')
    .attr('x', (d) => x(d))
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-muted)')
    .attr('font-size', 11)
    .text((d) => TICK_FORMAT(d));

  svg
    .append('text')
    .attr('x', margin.left + innerWidth / 2)
    .attr('y', axisY + 16)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-muted)')
    .attr('font-size', 11)
    .text(options.valueAxisLabel);
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
  facet: string,
  groupLabel: string,
  beforeText: string,
  afterText: string,
  beforeLabel: string,
  afterLabel: string,
) {
  tooltip.innerHTML = '';
  const valueEl = document.createElement('div');
  valueEl.className = 'tooltip-value';
  valueEl.textContent = `${beforeText} → ${afterText}`;
  const labelEl = document.createElement('div');
  labelEl.className = 'tooltip-label';
  labelEl.textContent = `${facet} · ${groupLabel} (${beforeLabel} → ${afterLabel})`;
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
