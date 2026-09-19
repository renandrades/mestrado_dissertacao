import type { CentralityLiftGroup, DumbbellChartConfig } from './types';

/**
 * Real data from the dissertation, Figure 5.1: AUC-PR before/after adding
 * graph centrality measures (degree, betweenness, closeness, clustering
 * coefficient) as extra node features, for three GNN algorithms across
 * three PPI networks.
 *
 * "before" = Multi-Omics features only. "after" = Multi-Omics + Centrality
 * measures.
 *
 * Note: IREF's GCN result is a real, intentional exception noted in the
 * dissertation text ("the only exception was the GCN model for the IREF
 * network, which did not benefit from the additional features") — its
 * AUC-PR slightly decreases rather than improves. This is not an error and
 * must not be smoothed over by the renderer.
 */
const groups: CentralityLiftGroup[] = ['gat', 'gcn', 'graphsage'];

const facets = ['HPRD', 'MULTINET', 'IREF'];

const values: Record<string, Record<CentralityLiftGroup, [number, number]>> = {
  HPRD: {
    gat: [0.3258, 0.3992],
    gcn: [0.4984, 0.596],
    graphsage: [0.3317, 0.3786],
  },
  MULTINET: {
    gat: [0.2182, 0.3648],
    gcn: [0.3839, 0.4019],
    graphsage: [0.2671, 0.3174],
  },
  IREF: {
    gat: [0.2144, 0.3598],
    gcn: [0.4315, 0.4274],
    graphsage: [0.2001, 0.2427],
  },
};

export const centralityLiftChart: DumbbellChartConfig = {
  type: 'dumbbell',
  id: 'centrality-lift',
  facets,
  groups,
  data: facets.flatMap((facet) =>
    groups.map((group) => ({
      facet,
      group,
      before: values[facet][group][0],
      after: values[facet][group][1],
    })),
  ),
  legendKeys: ['gat', 'gcn', 'graphsage'],
};
