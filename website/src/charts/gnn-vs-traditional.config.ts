import type { GroupedBarChartConfig, GroupedBarDatum } from './types';

/**
 * Real data from the dissertation, Figure 5.4: AUC-PR comparison between
 * the three GNN algorithms and the best traditional ML baseline (Gradient
 * Boosting Trees), all using multi-omics + centrality features, across
 * three PPI networks (RQ4/RQ5).
 *
 * Laid out as categories = networks, groups = algorithms (the transpose of
 * the dissertation figure's own axes) so this chart reuses the same
 * gat/gcn/graphsage/gbt color legend already established by the
 * centrality-lift and imbalance-strategies charts earlier in the
 * narrative, instead of introducing a second, unrelated color mapping for
 * networks.
 */
const categories = ['HPRD', 'MULTINET', 'IREF'];
const groups = ['gat', 'gcn', 'graphsage', 'gbt'] as const;

// Each row is a (gat, gcn, graphsage, gbt) AUC-PR tuple for one network.
const aucPr: Record<string, [number, number, number, number]> = {
  HPRD: [0.3992, 0.596, 0.3786, 0.5437],
  MULTINET: [0.3648, 0.4019, 0.3174, 0.4505],
  IREF: [0.3598, 0.4274, 0.2427, 0.423],
};

const data: GroupedBarDatum[] = categories.flatMap((category) =>
  groups.map((group, groupIndex) => ({
    facet: 'overview',
    category,
    group,
    value: aucPr[category][groupIndex],
  })),
);

export const gnnVsTraditionalChart: GroupedBarChartConfig = {
  type: 'grouped-bar',
  id: 'gnn-vs-traditional',
  facets: ['overview'],
  groups: [...groups],
  categories,
  data,
  legendKeys: [...groups],
};
