export interface StackedBarSeries {
  /** Semantic key, never a display label (labels come from i18n at render time). */
  key: string;
  /** Category key on the independent axis, e.g. a PPI network name. */
  category: string;
  value: number;
}

export interface StackedBarChartConfig {
  type: 'stacked-bar';
  id: string;
  /** Order of stack keys, bottom to top. */
  stackKeys: string[];
  categories: string[];
  data: StackedBarSeries[];
  /** Ordered legend entries; falls back to stackKeys when omitted. */
  legendKeys?: string[];
}

export type NetworkGroup = 'driver' | 'passenger' | 'unlabeled';

export interface ForceGraphNode {
  id: string;
  group: NetworkGroup;
}

export interface ForceGraphLink {
  source: string;
  target: string;
}

export interface ForceGraphChartConfig {
  type: 'force-graph';
  id: string;
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
  /** Ordered legend entries; rendered generically by the shared legend layout. */
  legendKeys?: string[];
}

export interface PipelineStage {
  /** Semantic key, never a display label (labels come from i18n at render time). */
  key: 'data-collection' | 'preprocessing' | 'training' | 'ensemble';
  /** Semantic keys for the stage's sub-steps, in display order (empty = no sub-steps). */
  substeps: string[];
}

export interface PipelineStepsChartConfig {
  type: 'pipeline-steps';
  id: string;
  stages: PipelineStage[];
  legendKeys?: string[];
}

export type CentralityLiftGroup = 'gat' | 'gcn' | 'graphsage';

export interface CentralityLiftDatum {
  facet: string;
  group: CentralityLiftGroup;
  /** AUC-PR with Multi-Omics features only. */
  before: number;
  /** AUC-PR with Multi-Omics + Centrality measures. */
  after: number;
}

export interface DumbbellChartConfig {
  type: 'dumbbell';
  id: string;
  /** Small-multiple panels, one per PPI network. Plain literal, not i18n'd. */
  facets: string[];
  groups: CentralityLiftGroup[];
  data: CentralityLiftDatum[];
  legendKeys?: string[];
}

export interface GroupedBarDatum {
  /** Small-multiple panel this datum belongs to (e.g. a PPI network name). */
  facet: string;
  /** X-axis category within the facet. A plain literal display string, not an i18n key. */
  category: string;
  /**
   * Semantic key for the grouped/colored series (e.g. "gat"). Translated via
   * i18n at render time (`chart.<chartId>.<group>`) and colored via
   * `var(--series-<group>)` — the key must match an existing `--series-<key>`
   * custom property in global.css.
   */
  group: string;
  value: number;
}

export interface GroupedBarChartConfig {
  type: 'grouped-bar';
  id: string;
  /**
   * Small-multiple panel keys, in display order. Plain literal, not
   * i18n-translated. A single-element array renders one panel with no
   * facet-title chrome.
   */
  facets: string[];
  /** Grouped/colored series, semantic keys, in display (and default legend) order. */
  groups: string[];
  /** X-axis categories within each facet, in display order. Plain literal, not i18n keys. */
  categories: string[];
  data: GroupedBarDatum[];
  /** Ordered legend entries; falls back to `groups` when omitted. */
  legendKeys?: string[];
}

export type ChartConfig =
  | StackedBarChartConfig
  | ForceGraphChartConfig
  | PipelineStepsChartConfig
  | DumbbellChartConfig
  | GroupedBarChartConfig;
