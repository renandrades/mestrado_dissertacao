import * as d3 from 'd3';
import type {
  ForceGraphChartConfig,
  ForceGraphLink,
  ForceGraphNode,
  NetworkGroup,
} from '../../charts/types';

/** Full localized phrase per group, used to build each node's aria-label
 * (e.g. en: "driver gene", pt: "gene driver" — word order differs by
 * language, so these come pre-composed from i18n rather than concatenated
 * here). */
export interface ForceGraphGroupLabels {
  driver: string;
  passenger: string;
  unlabeled: string;
}

interface RenderOptions {
  /** Chart title, used as the root SVG's aria-label. */
  title: string;
  groupAriaLabels: ForceGraphGroupLabels;
}

const RADIUS: Record<NetworkGroup, number> = {
  driver: 10,
  passenger: 6,
  unlabeled: 6,
};

const COLOR_VAR: Record<NetworkGroup, string> = {
  driver: '--series-driver',
  passenger: '--series-passenger',
  unlabeled: '--series-unlabeled',
};

// Driver nodes draw last (on top), reinforcing that they are the rare,
// important class — via size/z-order, never via a different hue.
const Z_ORDER: Record<NetworkGroup, number> = {
  unlabeled: 0,
  passenger: 1,
  driver: 2,
};

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  group: NetworkGroup;
}

type SimLink = d3.SimulationLinkDatum<SimNode>;

let measureCanvas: HTMLCanvasElement | null = null;

/** Pixel width of a node's label at the size/font it's actually drawn at, so
 * the layout's bounds-clamp can reserve enough room for the longest one. */
function estimateTextWidth(text: string): number {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return text.length * 6;
  ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
  return ctx.measureText(text).width;
}

function asNode(end: string | number | SimNode): SimNode {
  // After forceLink().id(...) resolves references during simulation ticks,
  // link.source/target are always the node objects, never bare ids.
  return end as SimNode;
}

export function renderForceGraph(
  container: HTMLElement,
  config: ForceGraphChartConfig,
  options: RenderOptions,
): void {
  container.innerHTML = '';

  const width = container.clientWidth || 480;
  const height = 460;
  const margin = 28;

  // Scale forces to the container's actual size so a narrow (mobile) canvas
  // doesn't get a layout tuned for a ~640px desktop one and then squeezed —
  // that pile-up is what causes labels to overlap at the edges.
  const linkDistance = Math.max(30, Math.min(64, width / 7));
  const chargeStrength = -Math.max(60, Math.min(220, width * 0.42));

  const nodes: SimNode[] = config.nodes.map((n: ForceGraphNode) => ({ ...n }));
  const links: SimLink[] = config.links.map((l: ForceGraphLink) => ({
    source: l.source,
    target: l.target,
  }));

  const simulation = d3
    .forceSimulation<SimNode>(nodes)
    .force(
      'link',
      d3
        .forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.5),
    )
    .force('charge', d3.forceManyBody().strength(chargeStrength))
    .force('center', d3.forceCenter(width / 2, height / 2))
    // Gentle, continuous pull toward the canvas center, so the layout settles
    // inside the container instead of relying on a hard clamp afterwards.
    .force('x', d3.forceX<SimNode>(width / 2).strength(0.035))
    .force('y', d3.forceY<SimNode>(height / 2).strength(0.04))
    .force(
      'collide',
      d3.forceCollide<SimNode>((d) => RADIUS[d.group] + 10).iterations(2),
    )
    .stop();

  // Run the simulation synchronously to a settled layout and render it once,
  // rather than animating on 'tick' — avoids jitter each time this chart is
  // scrolled back into view. d3-force's internal jiggle is deterministic, so
  // repeated renders of the same data produce the same layout.
  const SETTLE_TICKS = 400;
  for (let i = 0; i < SETTLE_TICKS; i += 1) simulation.tick();

  // Clamp to the canvas so nodes and their labels stay fully visible. Labels
  // sit to the right of each node, so the right-hand margin has to fit the
  // longest label text, not just the node's own radius.
  const maxLabelWidth = d3.max(nodes, (d) => estimateTextWidth(d.id)) ?? 0;
  for (const node of nodes) {
    const r = RADIUS[node.group];
    const leftLimit = r + 16;
    const rightLimit = width - (r + 5 + maxLabelWidth + 8);
    const vLimit = margin + r + 10;
    node.x = Math.max(leftLimit, Math.min(Math.max(rightLimit, leftLimit), node.x ?? width / 2));
    node.y = Math.max(vLimit, Math.min(height - vLimit, node.y ?? height / 2));
  }

  const svg = d3
    .select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    // "group", not "img": each node below is its own focusable, individually
    // labeled element. role="img" on the root would flatten the whole
    // subtree into one presentational image for assistive tech, hiding the
    // per-node aria-labels from screen readers.
    .attr('role', 'group')
    .attr('aria-label', options.title);

  svg
    .append('g')
    .attr('class', 'network-links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('x1', (d) => asNode(d.source).x ?? 0)
    .attr('y1', (d) => asNode(d.source).y ?? 0)
    .attr('x2', (d) => asNode(d.target).x ?? 0)
    .attr('y2', (d) => asNode(d.target).y ?? 0)
    .attr('stroke', 'var(--gridline)')
    .attr('stroke-width', 1);

  const tooltip = ensureTooltip();

  const drawOrder = [...nodes].sort((a, b) => Z_ORDER[a.group] - Z_ORDER[b.group]);

  const nodeGroups = svg
    .append('g')
    .attr('class', 'network-nodes')
    .selectAll('g')
    .data(drawOrder)
    .join('g')
    .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    .attr('tabindex', 0)
    .attr('role', 'img')
    .attr('aria-label', (d) => `${d.id}, ${options.groupAriaLabels[d.group]}`)
    .style('cursor', 'pointer');

  nodeGroups
    .append('circle')
    .attr('r', (d) => RADIUS[d.group])
    .attr('fill', (d) => `var(${COLOR_VAR[d.group]})`)
    .attr('stroke', 'var(--surface-1)')
    .attr('stroke-width', 1.5);

  nodeGroups
    .append('text')
    .attr('x', (d) => RADIUS[d.group] + 5)
    .attr('y', 3)
    .attr('font-size', 10)
    .attr('fill', 'var(--text-secondary)')
    .text((d) => d.id);

  nodeGroups
    .on('pointerenter pointermove focus', function (event: PointerEvent | FocusEvent, d: SimNode) {
      showTooltip(tooltip, event, d.id, options.groupAriaLabels[d.group]);
    })
    .on('pointerleave blur', () => hideTooltip(tooltip));
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
  nodeId: string,
  groupLabel: string,
) {
  tooltip.innerHTML = '';
  const valueEl = document.createElement('div');
  valueEl.className = 'tooltip-value';
  valueEl.textContent = nodeId;
  const labelEl = document.createElement('div');
  labelEl.className = 'tooltip-label';
  labelEl.textContent = groupLabel;
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
