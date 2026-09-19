import type { GroupedBarChartConfig, GroupedBarDatum } from './types';

/**
 * Real data from the dissertation, Chapter 6 (Table 6.5, Table 6.6 /
 * Figure 6.11): AUC-PR on the fixed independent test set for each of the
 * six individually-trained PPI networks, the naive UNION network (a simple
 * merge of all six), and the Ensemble-Average model (the average of the
 * six networks' predicted probabilities) — the dissertation's
 * best-performing approach.
 *
 * `group` distinguishes "an individual/baseline result" from "the
 * ensemble result" (see --series-individual / --series-ensemble in
 * global.css) rather than giving every network its own color — the point
 * of this chart is "ensemble beats every individual approach", not
 * per-network identity.
 */
const categories = ['HPRD', 'MULTINET', 'IREF', 'CPDB', 'PCNET', 'STRING', 'UNION', 'Ensemble-Average'];

const aucPr: Record<string, number> = {
  HPRD: 0.5768,
  MULTINET: 0.5947,
  IREF: 0.5663,
  CPDB: 0.5646,
  PCNET: 0.5925,
  STRING: 0.6358,
  UNION: 0.5579,
  'Ensemble-Average': 0.677,
};

const data: GroupedBarDatum[] = categories.map((category) => ({
  facet: 'overview',
  category,
  group: category === 'Ensemble-Average' ? 'ensemble' : 'individual',
  value: aucPr[category],
}));

export const ensembleComparisonChart: GroupedBarChartConfig = {
  type: 'grouped-bar',
  id: 'ensemble-comparison',
  facets: ['overview'],
  groups: ['individual', 'ensemble'],
  categories,
  data,
  legendKeys: ['individual', 'ensemble'],
};
