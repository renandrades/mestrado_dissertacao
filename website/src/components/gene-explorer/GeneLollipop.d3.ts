import * as d3 from 'd3';

/**
 * One gene's predictions, already resolved to plain values — no i18n keys,
 * no formatting. `networkOrder` controls row order top-to-bottom (pass
 * `meta.networks` from the dataset, e.g. hprd, multinet, iref, cpdb, pcnet,
 * string, union). A `null` entry in `networkValues` means the gene is
 * absent from that PPI network's graph — it is rendered as a distinct
 * hollow marker, never coalesced to 0.
 */
export interface GeneLollipopDatum {
  networkOrder: string[];
  networkValues: Record<string, number | null>;
  ensembleAvg: number | null;
}

/**
 * All copy/formatting is supplied by the caller (component-provided i18n
 * strings + already-formatted numbers), mirroring the
 * `formatAriaLabel`-callback convention already used by DumbbellChart.d3.ts:
 * this file only ever composes real label/value text handed to it, never
 * hardcodes English or Portuguese.
 */
export interface GeneLollipopOptions {
  /** Root <svg> aria-label, already interpolated with the gene symbol. */
  rootAriaLabel: string;
  /** Formats a raw 0–1 probability into display text (locale-aware %). */
  formatProbability: (value: number) => string;
  /** Builds a network row's aria-label from its display name + formatted value. */
  formatNetworkAria: (networkLabel: string, formattedValue: string) => string;
  /** Builds the aria-label for a row where the gene is absent from that network. */
  formatAbsentAria: (networkLabel: string) => string;
  /** Builds the ensemble-average marker's aria-label from its formatted value. */
  formatEnsembleAria: (formattedValue: string) => string;
  /** Tooltip value text shown for an absent-network row. */
  notAvailableLabel: string;
  /** Row label + tooltip label used for the ensemble-average marker. */
  ensembleAverageLabel: string;
}

// Real PPI database names — plain literals, not i18n'd, same convention as
// other chart-facet names in this codebase (see DumbbellChartConfig.facets /
// GroupedBarChartConfig.facets in charts/types.ts: proper nouns naming a PPI
// network are never translated). Falls back to an uppercased key for any
// network not listed here.
const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  hprd: 'HPRD',
  multinet: 'MultiNet',
  iref: 'iRefIndex',
  cpdb: 'CPDB',
  pcnet: 'PCNet',
  string: 'STRING',
  union: 'UNION',
};

const ROW_HEIGHT = 30;
const ENSEMBLE_ROW_HEIGHT = 36;
const DIVIDER_GAP = 22;
const MARGIN = { top: 10, right: 24, bottom: 30, left: 104 };

function networkLabelFor(networkKey: string): string {
  return NETWORK_DISPLAY_NAMES[networkKey] ?? networkKey.toUpperCase();
}

function diamondPath(cx: number, cy: number, r: number): string {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`;
}

export function renderGeneLollipop(
  container: HTMLElement,
  data: GeneLollipopDatum,
  options: GeneLollipopOptions,
): void {
  container.innerHTML = '';

  const width = container.clientWidth || 480;
  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 120);
  const innerHeight = data.networkOrder.length * ROW_HEIGHT + DIVIDER_GAP + ENSEMBLE_ROW_HEIGHT;
  const height = MARGIN.top + innerHeight + MARGIN.bottom;

  const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]).clamp(true);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    // "group", not "img": every row below is its own focusable,
    // individually labeled mark (a per-network probability, or the
    // ensemble-average summary). role="img" on the root would flatten the
    // whole subtree into one presentational image for assistive tech,
    // hiding each row's aria-label (same reasoning as StackedBar.d3.ts /
    // NetworkGraph.d3.ts elsewhere in this codebase).
    .attr('role', 'group')
    .attr('aria-label', options.rootAriaLabel);

  const root = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Gridlines plus the 0.5 decision threshold (dashed, on the --baseline
  // token rather than --gridline, so it reads as more than a plain tick):
  // every network row's dot is colored by whether it crosses this line.
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  root
    .append('g')
    .selectAll('line')
    .data(ticks)
    .join('line')
    .attr('x1', (d) => x(d))
    .attr('x2', (d) => x(d))
    .attr('y1', 0)
    .attr('y2', innerHeight)
    .attr('stroke', (d) => (d === 0.5 ? 'var(--baseline)' : 'var(--gridline)'))
    .attr('stroke-dasharray', (d) => (d === 0.5 ? '3,3' : null))
    .attr('stroke-width', 1);

  root
    .append('g')
    .selectAll('text')
    .data(ticks)
    .join('text')
    .attr('x', (d) => x(d))
    .attr('y', innerHeight + 18)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-muted)')
    .attr('font-size', 10)
    .text((d) => d3.format('.0%')(d));

  const tooltip = ensureTooltip();

  data.networkOrder.forEach((networkKey, i) => {
    const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const value = data.networkValues[networkKey] ?? null;
    const networkLabel = networkLabelFor(networkKey);

    const row = root.append('g').attr('transform', `translate(0,${cy})`);

    row
      .append('text')
      .attr('x', -10)
      .attr('y', 0)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', 11)
      .text(networkLabel);

    const mark = row.append('g').attr('tabindex', 0).attr('role', 'img');
    const hitArea = () =>
      mark
        .append('rect')
        .attr('x', 0)
        .attr('y', -ROW_HEIGHT / 2)
        .attr('width', innerWidth)
        .attr('height', ROW_HEIGHT)
        .attr('fill', 'transparent');

    if (value === null) {
      mark.attr('aria-label', options.formatAbsentAria(networkLabel));

      // Absent from this network: a hollow, dashed marker with NO
      // connecting line, deliberately centered on the axis (not at x(0)) —
      // a real 0 probability also draws its dot at x(0), and this must
      // never be mistaken for that.
      const cx = x(0.5);
      mark
        .append('circle')
        .attr('cx', cx)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', 'var(--surface-1)')
        .attr('stroke', 'var(--series-unlabeled)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2');
      const crossOffset = 3;
      mark
        .append('line')
        .attr('x1', cx - crossOffset)
        .attr('y1', -crossOffset)
        .attr('x2', cx + crossOffset)
        .attr('y2', crossOffset)
        .attr('stroke', 'var(--series-unlabeled)')
        .attr('stroke-width', 1.5);
      mark
        .append('line')
        .attr('x1', cx - crossOffset)
        .attr('y1', crossOffset)
        .attr('x2', cx + crossOffset)
        .attr('y2', -crossOffset)
        .attr('stroke', 'var(--series-unlabeled)')
        .attr('stroke-width', 1.5);

      hitArea()
        .on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
          showRowTooltip(tooltip, event, networkLabel, options.notAvailableLabel);
        })
        .on('pointerleave blur', () => hideTooltip(tooltip));
    } else {
      const formatted = options.formatProbability(value);
      mark.attr('aria-label', options.formatNetworkAria(networkLabel, formatted));
      const color = value >= 0.5 ? 'var(--series-driver)' : 'var(--series-passenger)';

      mark
        .append('line')
        .attr('x1', x(0))
        .attr('x2', x(value))
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', color)
        .attr('stroke-width', 2);
      mark.append('circle').attr('cx', x(value)).attr('cy', 0).attr('r', 5).attr('fill', color);

      hitArea()
        .on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
          showRowTooltip(tooltip, event, networkLabel, formatted);
        })
        .on('pointerleave blur', () => hideTooltip(tooltip));
    }
  });

  // Divider separating the derived ensemble-average summary from the
  // per-network rows above it — it isn't "one more network".
  const dividerY = data.networkOrder.length * ROW_HEIGHT + DIVIDER_GAP / 2;
  root
    .append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', dividerY)
    .attr('y2', dividerY)
    .attr('stroke', 'var(--border-hairline)')
    .attr('stroke-width', 1);

  const ensembleCy = data.networkOrder.length * ROW_HEIGHT + DIVIDER_GAP + ENSEMBLE_ROW_HEIGHT / 2;
  const ensembleRow = root.append('g').attr('transform', `translate(0,${ensembleCy})`);

  ensembleRow
    .append('text')
    .attr('x', -10)
    .attr('y', 0)
    .attr('dy', '0.32em')
    .attr('text-anchor', 'end')
    .attr('fill', 'var(--text-secondary)')
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .text(options.ensembleAverageLabel);

  const ensembleMark = ensembleRow.append('g').attr('tabindex', 0).attr('role', 'img');
  const ensembleHitArea = () =>
    ensembleMark
      .append('rect')
      .attr('x', 0)
      .attr('y', -ENSEMBLE_ROW_HEIGHT / 2)
      .attr('width', innerWidth)
      .attr('height', ENSEMBLE_ROW_HEIGHT)
      .attr('fill', 'transparent');

  if (data.ensembleAvg === null) {
    // Defensive: every real gene has an ensembleAvg, but never assume it.
    ensembleMark.attr('aria-label', options.formatAbsentAria(options.ensembleAverageLabel));
    const cx = x(0.5);
    ensembleMark
      .append('path')
      .attr('d', diamondPath(cx, 0, 8))
      .attr('fill', 'var(--surface-1)')
      .attr('stroke', 'var(--series-unlabeled)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2');

    ensembleHitArea()
      .on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
        showRowTooltip(tooltip, event, options.ensembleAverageLabel, options.notAvailableLabel);
      })
      .on('pointerleave blur', () => hideTooltip(tooltip));
  } else {
    const value = data.ensembleAvg;
    const formatted = options.formatProbability(value);
    ensembleMark.attr('aria-label', options.formatEnsembleAria(formatted));
    const color = value >= 0.5 ? 'var(--series-driver)' : 'var(--series-passenger)';

    ensembleMark
      .append('line')
      .attr('x1', x(0))
      .attr('x2', x(value))
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', color)
      .attr('stroke-width', 3);
    // Diamond, not a circle: visually sets the derived summary apart from
    // the seven individual-network dots above it.
    ensembleMark
      .append('path')
      .attr('d', diamondPath(x(value), 0, 8))
      .attr('fill', color)
      .attr('stroke', 'var(--surface-1)')
      .attr('stroke-width', 1.5);

    ensembleHitArea()
      .on('pointerenter pointermove focus', (event: PointerEvent | FocusEvent) => {
        showRowTooltip(tooltip, event, options.ensembleAverageLabel, formatted);
      })
      .on('pointerleave blur', () => hideTooltip(tooltip));
  }
}

// Same create-if-missing .viz-tooltip helper, and the same textContent-based
// population, as StackedBar.d3.ts / DumbbellChart.d3.ts / GroupedBarChart.d3.ts
// — each chart file owns its own copy rather than importing a shared one,
// matching this codebase's existing convention.
function ensureTooltip(): HTMLDivElement {
  let el = document.querySelector<HTMLDivElement>('.viz-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.className = 'viz-tooltip';
    document.body.appendChild(el);
  }
  return el;
}

function showRowTooltip(
  tooltip: HTMLDivElement,
  event: PointerEvent | FocusEvent,
  rowLabel: string,
  valueText: string,
): void {
  tooltip.innerHTML = '';
  const valueEl = document.createElement('div');
  valueEl.className = 'tooltip-value';
  valueEl.textContent = valueText;
  const labelEl = document.createElement('div');
  labelEl.className = 'tooltip-label';
  labelEl.textContent = rowLabel;
  tooltip.append(valueEl, labelEl);
  tooltip.classList.add('is-visible');

  const point = 'clientX' in event ? event : null;
  if (point) {
    tooltip.style.left = `${point.clientX + 12}px`;
    tooltip.style.top = `${point.clientY + 12}px`;
  }
}

function hideTooltip(tooltip: HTMLDivElement): void {
  tooltip.classList.remove('is-visible');
}
