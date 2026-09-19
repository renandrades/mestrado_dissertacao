import type { ChartConfig } from './types';
import { classImbalanceChart } from './class-imbalance.config';
import { networkIdeaChart } from './network-idea.config';
import { methodologyPipelineChart } from './methodology.config';
import { centralityLiftChart } from './centrality-lift.config';
import { imbalanceStrategiesChart } from './imbalance-strategies.config';
import { gnnVsTraditionalChart } from './gnn-vs-traditional.config';
import { refinedModelChart } from './refined-model.config';
import { ensembleComparisonChart } from './ensemble-comparison.config';

/**
 * Maps a section's `chartId` frontmatter to its data config. Add one entry
 * here per new chart; the render side-dispatches on `config.type` in
 * `components/charts/render.ts`.
 */
export const chartRegistry: Record<string, ChartConfig> = {
  [classImbalanceChart.id]: classImbalanceChart,
  [networkIdeaChart.id]: networkIdeaChart,
  [methodologyPipelineChart.id]: methodologyPipelineChart,
  [centralityLiftChart.id]: centralityLiftChart,
  [imbalanceStrategiesChart.id]: imbalanceStrategiesChart,
  [gnnVsTraditionalChart.id]: gnnVsTraditionalChart,
  [refinedModelChart.id]: refinedModelChart,
  [ensembleComparisonChart.id]: ensembleComparisonChart,
};
