import type { GroupedBarChartConfig, GroupedBarDatum } from './types';

/**
 * Real data from the dissertation, Table 6.5: AUC-PR of the
 * hyperparameter-tuned GCN model on the fixed independent test set, one
 * model per PPI network. Uses the 'gcn' group/color established earlier in
 * the narrative (Chapter 6 is entirely about the GCN model), rather than
 * introducing a new single-series color for what is, structurally, a
 * single-group grouped-bar chart.
 */
const categories = ['HPRD', 'MULTINET', 'IREF', 'CPDB', 'PCNET', 'STRING'];

const aucPr: Record<string, number> = {
  HPRD: 0.5768,
  MULTINET: 0.5947,
  IREF: 0.5663,
  CPDB: 0.5646,
  PCNET: 0.5925,
  STRING: 0.6358,
};

const data: GroupedBarDatum[] = categories.map((category) => ({
  facet: 'overview',
  category,
  group: 'gcn',
  value: aucPr[category],
}));

export const refinedModelChart: GroupedBarChartConfig = {
  type: 'grouped-bar',
  id: 'refined-model',
  facets: ['overview'],
  groups: ['gcn'],
  categories,
  data,
  legendKeys: ['gcn'],
};
