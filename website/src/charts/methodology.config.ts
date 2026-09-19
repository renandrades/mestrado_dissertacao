/**
 * Data config for the "Metodologia" / "Methodology" section chart: a
 * 4-stage pipeline diagram recreating the dissertation's Figure 4.1.
 */

import type { PipelineStepsChartConfig } from './types';

export const methodologyPipelineChart: PipelineStepsChartConfig = {
  type: 'pipeline-steps',
  id: 'methodology-pipeline',
  stages: [
    {
      key: 'data-collection',
      substeps: ['ppi-network', 'omics-features', 'labeled-examples'],
    },
    {
      key: 'preprocessing',
      substeps: ['id-mapping', 'network-feature-intersection', 'centrality-computation'],
    },
    {
      key: 'training',
      substeps: [
        'algorithm-selection',
        'imbalance-handling',
        'hyperparameter-optimization',
        'evaluation',
      ],
    },
    {
      key: 'ensemble',
      substeps: [],
    },
  ],
};
