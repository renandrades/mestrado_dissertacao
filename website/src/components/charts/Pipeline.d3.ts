import * as d3 from 'd3';
import type { PipelineStepsChartConfig } from '../../charts/types';

type LabelMap = Record<string, string>;

interface RenderOptions {
  /** Diagram title, used as the root list's aria-label (not shown visually). */
  title: string;
  /** Display label per stage key, e.g. { 'data-collection': 'Data collection' }. */
  stageLabels: LabelMap;
  /** Display label per sub-step key, e.g. { 'ppi-network': 'PPI network' }. */
  substepLabels: LabelMap;
}

type StageListSelection = d3.Selection<HTMLUListElement, unknown, null, undefined>;

/**
 * Renders the 4-stage methodology pipeline (dissertation Fig. 4.1) as a
 * vertical sequence of stage cards connected by flow arrows.
 *
 * Built with plain HTML elements (via D3 selections) rather than SVG:
 * wrapping multi-line sub-step text is simpler this way, and every label
 * stays real, selectable/searchable DOM text. The diagram is a real <ul>/<li>
 * list (role="list" is set explicitly too, since Safari drops the implicit
 * list role once `list-style: none` is applied) rather than role="img",
 * because the content is fully conveyed by visible text, not a rendered
 * shape.
 */
export function renderPipelineSteps(
  container: HTMLElement,
  config: PipelineStepsChartConfig,
  options: RenderOptions,
): void {
  container.innerHTML = '';

  // `container` (.viz-canvas) has no CSS-defined height of its own — it's
  // content-sized, like the other charts' canvases — so a plain CSS
  // `max-height: 100%` here would resolve against an auto-height ancestor
  // and compute to "none" (no cap at all). Measure the real pixel budget
  // from the sticky column instead, which does have a definite height.
  const stickyViz = container.closest<HTMLElement>('.sticky-viz');
  const verticalPadding = 2 * parseFloat(getComputedStyle(container).paddingTop || '0');
  const availableHeight = (stickyViz?.clientHeight ?? 640) - verticalPadding;

  const list: StageListSelection = d3
    .select(container)
    .append('ul')
    .attr('role', 'list')
    .attr('aria-label', options.title)
    // Focusable so keyboard users can reach and scroll this region if its
    // content ever exceeds the sticky column's height (see max-height/
    // overflow-y below) — WCAG 2.1.1.
    .attr('tabindex', 0)
    .style('list-style', 'none')
    .style('margin', '0')
    .style('padding', '0')
    .style('display', 'flex')
    .style('flex-direction', 'column')
    .style('width', '100%')
    .style('max-height', `${availableHeight}px`)
    .style('overflow-y', 'auto');

  const stageCount = config.stages.length;

  config.stages.forEach((stage, index) => {
    const stageLabel = options.stageLabels[stage.key] ?? stage.key;

    const item = list
      .append('li')
      .attr('role', 'listitem')
      .attr('aria-setsize', stageCount)
      .attr('aria-posinset', index + 1)
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('gap', '0.5rem')
      .style('padding', '0.9rem 1.1rem')
      .style('border', '1px solid var(--border-hairline)')
      .style('border-radius', '8px')
      .style('background', 'var(--surface-1)');

    const heading = item
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'baseline')
      .style('gap', '0.55rem');

    heading
      .append('span')
      .attr('aria-hidden', 'true')
      .style('font-size', '0.7rem')
      .style('font-weight', '700')
      .style('letter-spacing', '0.04em')
      .style('color', 'var(--text-muted)')
      .text(String(index + 1).padStart(2, '0'));

    heading
      .append('h3')
      .style('margin', '0')
      .style('font-size', '1.05rem')
      .style('font-weight', '700')
      .style('color', 'var(--text-primary)')
      .text(stageLabel);

    if (stage.substeps.length > 0) {
      const substepList = item
        .append('ul')
        .attr('role', 'list')
        .style('list-style', 'none')
        .style('margin', '0')
        .style('padding', '0')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '0.3rem');

      stage.substeps.forEach((substepKey) => {
        const substepLabel = options.substepLabels[substepKey] ?? substepKey;
        substepList
          .append('li')
          .attr('role', 'listitem')
          .style('font-size', '0.85rem')
          .style('line-height', '1.4')
          .style('color', 'var(--text-secondary)')
          .style('padding-left', '0.65rem')
          .style('border-left', '2px solid var(--gridline)')
          .text(substepLabel);
      });
    }

    if (index < stageCount - 1) {
      appendConnector(list);
    }
  });
}

/** A decorative flow arrow between two consecutive stage cards. */
function appendConnector(list: StageListSelection): void {
  const connector = list
    .append('li')
    .attr('role', 'presentation')
    .attr('aria-hidden', 'true')
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('padding', '0.2rem 0');

  connector
    .append('svg')
    .attr('width', 16)
    .attr('height', 22)
    .attr('viewBox', '0 0 16 22')
    .append('path')
    .attr('d', 'M8,1 L8,14 M2,10 L8,16 L14,10')
    .attr('fill', 'none')
    .attr('stroke', 'var(--baseline)')
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round');
}
