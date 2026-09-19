import type { ChartConfig } from '../../charts/types';
import { renderStackedBar } from './StackedBar.d3';
import { renderForceGraph } from './NetworkGraph.d3';
import { renderPipelineSteps } from './Pipeline.d3';
import { renderDumbbell } from './DumbbellChart.d3';
import { renderGroupedBar } from './GroupedBarChart.d3';
import { getSeriesLabel, getAxisLabel, getChartTitle } from '../../charts/labels';
import type { Lang } from '../../i18n/ui';

export function renderChart(container: HTMLElement, config: ChartConfig, lang: Lang): void {
  switch (config.type) {
    case 'stacked-bar': {
      renderStackedBar(container, config, {
        seriesLabels: Object.fromEntries(
          config.stackKeys.map((key) => [key, getSeriesLabel(config.id, key, lang)]),
        ),
        yAxisLabel: getAxisLabel(config.id, lang),
      });
      return;
    }
    case 'force-graph': {
      renderForceGraph(container, config, {
        title: getChartTitle(config.id, lang),
        groupAriaLabels: {
          driver: getSeriesLabel(config.id, 'driver-aria', lang),
          passenger: getSeriesLabel(config.id, 'passenger-aria', lang),
          unlabeled: getSeriesLabel(config.id, 'unlabeled-aria', lang),
        },
      });
      return;
    }
    case 'pipeline-steps': {
      const substepKeys = Array.from(new Set(config.stages.flatMap((stage) => stage.substeps)));
      renderPipelineSteps(container, config, {
        title: getChartTitle(config.id, lang),
        stageLabels: Object.fromEntries(
          config.stages.map((stage) => [stage.key, getSeriesLabel(config.id, stage.key, lang)]),
        ),
        substepLabels: Object.fromEntries(
          substepKeys.map((key) => [key, getSeriesLabel(config.id, key, lang)]),
        ),
      });
      return;
    }
    case 'dumbbell': {
      const ariaTemplate = getSeriesLabel(config.id, 'aria-template', lang);
      renderDumbbell(container, config, {
        title: getChartTitle(config.id, lang),
        groupLabels: Object.fromEntries(
          config.groups.map((key) => [key, getSeriesLabel(config.id, key, lang)]),
        ),
        beforeLabel: getSeriesLabel(config.id, 'before', lang),
        afterLabel: getSeriesLabel(config.id, 'after', lang),
        valueAxisLabel: getAxisLabel(config.id, lang),
        formatAriaLabel: (facet, groupLabel, beforeText, afterText) =>
          ariaTemplate
            .replace('{facet}', facet)
            .replace('{group}', groupLabel)
            .replace('{before}', beforeText)
            .replace('{after}', afterText),
      });
      return;
    }
    case 'grouped-bar': {
      renderGroupedBar(container, config, {
        groupLabels: Object.fromEntries(
          config.groups.map((key) => [key, getSeriesLabel(config.id, key, lang)]),
        ),
        yAxisLabel: getAxisLabel(config.id, lang),
        title: getChartTitle(config.id, lang),
      });
      return;
    }
    default: {
      const exhaustive: never = config;
      throw new Error(`Unknown chart type: ${JSON.stringify(exhaustive)}`);
    }
  }
}
