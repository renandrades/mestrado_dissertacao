/**
 * Illustrative toy PPI (protein-protein interaction) network for the
 * "A ideia" / "The idea" section: a small, hand-built graph — NOT real
 * interaction data or real driver-gene predictions — used to visually
 * explain the dissertation's core modeling idea: genes as nodes in a PPI
 * network, with a Graph Neural Network propagating information between
 * neighboring genes to predict which ones are cancer drivers. Directly
 * inspired by the bottom diagram of the dissertation's Figure 4.2.
 *
 * Gene symbols are used for their realistic, gene-like feel; the graph
 * itself (which genes exist, how they connect, which are "driver") is
 * fabricated for illustration only.
 */

import type { ForceGraphChartConfig } from './types';

export const networkIdeaChart: ForceGraphChartConfig = {
  type: 'force-graph',
  id: 'ppi-network',
  legendKeys: ['unlabeled', 'passenger', 'driver'],
  nodes: [
    // Driver genes: rare, high-signal class the whole dissertation is about.
    { id: 'TP53', group: 'driver' },
    { id: 'BRCA1', group: 'driver' },
    { id: 'KRAS', group: 'driver' },
    // Passenger genes: majority class, connected but not causal.
    { id: 'MYH9', group: 'passenger' },
    { id: 'ACTB', group: 'passenger' },
    { id: 'GAPDH', group: 'passenger' },
    { id: 'TUBB5', group: 'passenger' },
    { id: 'HSPA8', group: 'passenger' },
    { id: 'RPL11', group: 'passenger' },
    { id: 'EEF2', group: 'passenger' },
    { id: 'VCL', group: 'passenger' },
    { id: 'FLNA', group: 'passenger' },
    { id: 'CALM2', group: 'passenger' },
    { id: 'HNRNPA1', group: 'passenger' },
    // Unlabeled genes: no ground-truth class yet, what the GNN predicts on.
    { id: 'ZNF521', group: 'unlabeled' },
    { id: 'ORF15', group: 'unlabeled' },
    { id: 'KIAA1109', group: 'unlabeled' },
    { id: 'C11orf80', group: 'unlabeled' },
  ],
  links: [
    // TP53 is the illustrative hub, as in real PPI networks.
    { source: 'TP53', target: 'BRCA1' },
    { source: 'TP53', target: 'KRAS' },
    { source: 'TP53', target: 'MYH9' },
    { source: 'TP53', target: 'HSPA8' },
    { source: 'TP53', target: 'CALM2' },
    { source: 'TP53', target: 'ZNF521' },
    { source: 'BRCA1', target: 'RPL11' },
    { source: 'BRCA1', target: 'EEF2' },
    { source: 'BRCA1', target: 'ORF15' },
    { source: 'KRAS', target: 'VCL' },
    { source: 'KRAS', target: 'FLNA' },
    // ACTB (actin) as a second, cytoskeletal hub.
    { source: 'ACTB', target: 'MYH9' },
    { source: 'ACTB', target: 'VCL' },
    { source: 'ACTB', target: 'FLNA' },
    { source: 'ACTB', target: 'GAPDH' },
    { source: 'ACTB', target: 'TUBB5' },
    { source: 'GAPDH', target: 'HNRNPA1' },
    { source: 'TUBB5', target: 'KIAA1109' },
    { source: 'HSPA8', target: 'HNRNPA1' },
    { source: 'CALM2', target: 'C11orf80' },
    { source: 'VCL', target: 'FLNA' },
    { source: 'RPL11', target: 'EEF2' },
  ],
};
