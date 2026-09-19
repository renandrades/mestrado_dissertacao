import type { GroupedBarChartConfig, GroupedBarDatum } from './types';

/**
 * Real data from the dissertation, Table 5.4: AUC-PR per class-imbalance
 * handling strategy, GNN algorithm, and PPI network (RQ3).
 */
const facets = ['HPRD', 'MULTINET', 'IREF'];
const groups = ['gat', 'gcn', 'graphsage'] as const;
// Short forms on purpose: at the sticky column's typical width, three
// side-by-side facet panels leave little room per category label before
// GroupedBarChart.d3.ts's rotation+truncation kicks in. "Focal Loss
// (γ=0.5/1/2)" would all truncate to an identical "Focal…" prefix and
// become visually indistinguishable from each other; leading with the
// differentiating γ value avoids that. The full strategy names ("Focal
// Loss, γ=0.5" etc.) are still in the section's own prose and reachable
// per-bar via tooltip/aria-label regardless of what's truncated on-axis.
const categories = ['Cross-entropy', 'Undersampling', 'Balanced CE', 'γ=0.5', 'γ=1', 'γ=2'];

// Each row is a (gat, gcn, graphsage) AUC-PR tuple for one [facet][category].
const aucPr: Record<string, [number, number, number][]> = {
  HPRD: [
    [0.3992, 0.596, 0.3786],
    [0.3275, 0.5479, 0.3332],
    [0.4215, 0.5918, 0.4069],
    [0.3873, 0.5235, 0.423],
    [0.3581, 0.5756, 0.3985],
    [0.3792, 0.5583, 0.448],
  ],
  MULTINET: [
    [0.3648, 0.4019, 0.3174],
    [0.2817, 0.4521, 0.2188],
    [0.3551, 0.4661, 0.3929],
    [0.4143, 0.4177, 0.3264],
    [0.3363, 0.2978, 0.3196],
    [0.2753, 0.4481, 0.3822],
  ],
  IREF: [
    [0.3598, 0.4274, 0.2427],
    [0.1714, 0.4384, 0.1887],
    [0.3135, 0.4841, 0.3013],
    [0.3546, 0.4664, 0.2296],
    [0.2977, 0.3776, 0.2832],
    [0.3917, 0.4488, 0.2928],
  ],
};

const data: GroupedBarDatum[] = facets.flatMap((facet) =>
  categories.flatMap((category, categoryIndex) =>
    groups.map((group, groupIndex) => ({
      facet,
      category,
      group,
      value: aucPr[facet][categoryIndex][groupIndex],
    })),
  ),
);

export const imbalanceStrategiesChart: GroupedBarChartConfig = {
  type: 'grouped-bar',
  id: 'imbalance-strategies',
  facets,
  groups: [...groups],
  categories,
  data,
  legendKeys: [...groups],
};
