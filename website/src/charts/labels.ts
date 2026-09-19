import { ui, type Lang, type UiKey } from '../i18n/ui';

/**
 * Resolves the display label for a chart's series key (e.g. "driver") from
 * the i18n dictionary, using the `chart.<chartId>.<seriesKey>` convention.
 * Shared between server-rendered legends/tables (ChartMount.astro) and
 * client-side render functions (components/charts/render.ts) so both read
 * labels the same way.
 */
export function getSeriesLabel(chartId: string, seriesKey: string, lang: Lang): string {
  const key = `chart.${chartId}.${seriesKey}` as UiKey;
  return ui[lang][key] ?? seriesKey;
}

export function getChartTitle(chartId: string, lang: Lang): string {
  const key = `chart.${chartId}.title` as UiKey;
  return ui[lang][key] ?? chartId;
}

export function getAxisLabel(chartId: string, lang: Lang): string {
  const key = `chart.${chartId}.yaxis` as UiKey;
  return ui[lang][key] ?? '';
}
