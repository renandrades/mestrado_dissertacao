import type { StackedBarChartConfig } from './types';

/**
 * Real data from the dissertation, Figure 4.3 (p. 86): final distribution of
 * class labels per PPI network, after gene ID mapping and omics intersection.
 */
const networks = ['HPRD', 'MULTINET', 'IREF', 'CPDB', 'PCNET', 'STRING', 'UNION'];

const counts: Record<string, { driver: number; passenger: number; unlabeled: number }> = {
  HPRD: { driver: 793, passenger: 4873, unlabeled: 3772 },
  MULTINET: { driver: 868, passenger: 8486, unlabeled: 4633 },
  IREF: { driver: 874, passenger: 8838, unlabeled: 4915 },
  CPDB: { driver: 889, passenger: 10043, unlabeled: 5311 },
  PCNET: { driver: 907, passenger: 12454, unlabeled: 5755 },
  STRING: { driver: 865, passenger: 11473, unlabeled: 5534 },
  UNION: { driver: 907, passenger: 12918, unlabeled: 5777 },
};

export const classImbalanceChart: StackedBarChartConfig = {
  type: 'stacked-bar',
  id: 'class-imbalance',
  stackKeys: ['unlabeled', 'passenger', 'driver'],
  categories: networks,
  data: networks.flatMap((network) => [
    { key: 'unlabeled', category: network, value: counts[network].unlabeled },
    { key: 'passenger', category: network, value: counts[network].passenger },
    { key: 'driver', category: network, value: counts[network].driver },
  ]),
};
