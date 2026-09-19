import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '../../i18n/ui';
import { renderGeneLollipop, type GeneLollipopDatum, type GeneLollipopOptions } from './GeneLollipop.d3';

/**
 * Every string this feature needs, keyed exactly like src/i18n/ui.ts's flat
 * `"<namespace>.<suffix>"` dictionary (namespace: "gene-explorer"). ui.ts
 * has no such keys yet and this component must not edit it — GeneExplorer.astro
 * supplies a local `{ pt, en }` object satisfying this exact shape, and the
 * integrator moves those key/value pairs into ui.ts's pt/en blocks verbatim.
 */
export interface GeneExplorerStrings {
  'gene-explorer.title': string;
  'gene-explorer.intro': string;
  'gene-explorer.search-label': string;
  'gene-explorer.search-placeholder': string;
  'gene-explorer.combobox-instructions': string;
  'gene-explorer.results-listbox-label': string;
  'gene-explorer.loading': string;
  'gene-explorer.error': string;
  'gene-explorer.no-results': string;
  'gene-explorer.more-results-template': string;
  'gene-explorer.examples-label': string;
  'gene-explorer.example-hint-sp1': string;
  'gene-explorer.example-hint-ywhaz': string;
  'gene-explorer.detail-heading-template': string;
  'gene-explorer.true-label-heading': string;
  'gene-explorer.true-driver': string;
  'gene-explorer.true-passenger': string;
  'gene-explorer.true-unlabeled': string;
  'gene-explorer.ensemble-avg-label': string;
  'gene-explorer.ensemble-avg-unavailable': string;
  'gene-explorer.majority-template': string;
  'gene-explorer.majority-verdict-driver': string;
  'gene-explorer.majority-verdict-passenger': string;
  'gene-explorer.chart-heading': string;
  'gene-explorer.chart-root-aria-template': string;
  'gene-explorer.chart-value-aria-template': string;
  'gene-explorer.chart-absent-aria-template': string;
  'gene-explorer.chart-ensemble-aria-template': string;
  'gene-explorer.chart-legend-driver': string;
  'gene-explorer.chart-legend-passenger': string;
  'gene-explorer.chart-legend-absent': string;
  'gene-explorer.chart-legend-ensemble': string;
  'gene-explorer.chart-tooltip-not-available': string;
}

interface GenePrediction {
  /** Ground truth: 1 = known driver, 0 = known passenger, -1 = unlabeled. */
  true: -1 | 0 | 1;
  /** Predicted probability per network; null = gene absent from that network's graph. */
  networks: Record<string, number | null>;
  /** Mean predicted probability across meta.ensembleNetworks (never treats a missing value as 0). */
  ensembleAvg: number | null;
  /** 1 if >=3 of the 6 ensemble networks predict driver (their own value >= 0.5), else 0. */
  ensembleMajority: 0 | 1;
}

interface GeneDatasetMeta {
  networks: string[];
  ensembleNetworks: string[];
  geneCount: number;
}

interface GeneDataset {
  meta: GeneDatasetMeta;
  genes: Record<string, GenePrediction>;
}

interface GeneExplorerProps {
  lang: Lang;
  strings: GeneExplorerStrings;
}

const SUGGESTION_LIMIT = 8;

const EXAMPLE_GENES: { symbol: string; hintKey: keyof GeneExplorerStrings }[] = [
  { symbol: 'SP1', hintKey: 'gene-explorer.example-hint-sp1' },
  { symbol: 'YWHAZ', hintKey: 'gene-explorer.example-hint-ywhaz' },
];

/** Minimal `{key}` template interpolation — no new dependency needed for this. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

/** Leftmost index where `value` could be inserted keeping `sorted` sorted. */
function bisectLeft(sorted: string[], value: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Exclusive upper bound for the range of strings starting with `prefix`. */
function prefixUpperBound(prefix: string): string {
  if (prefix.length === 0) return prefix;
  const lastCode = prefix.charCodeAt(prefix.length - 1);
  return `${prefix.slice(0, -1)}${String.fromCharCode(lastCode + 1)}`;
}

const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const chipButtonStyle = {
  marginRight: '0.5rem',
  marginBottom: '0.4rem',
  padding: '0.3rem 0.7rem',
  borderRadius: '999px',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const labelTextStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  marginBottom: '0.2rem',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

const valueTextStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  border: '1px solid var(--border-hairline)',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const dotSwatchStyle = {
  display: 'inline-block',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  flexShrink: 0,
};

const hollowSwatchStyle = {
  display: 'inline-block',
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  border: '1.5px dashed var(--series-unlabeled)',
  background: 'var(--surface-1)',
  flexShrink: 0,
};

const diamondSwatchStyle = {
  display: 'inline-block',
  width: '9px',
  height: '9px',
  background: 'var(--text-secondary)',
  transform: 'rotate(45deg)',
  flexShrink: 0,
};

const legendListStyle = {
  listStyle: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  margin: '0.75rem 0 0',
  padding: 0,
  fontSize: '0.8rem',
  color: 'var(--text-secondary)',
};

const legendItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
};

interface GeneDetailPanelProps {
  gene: string;
  prediction: GenePrediction;
  meta: GeneDatasetMeta;
  lang: Lang;
  strings: GeneExplorerStrings;
}

function GeneDetailPanel({ gene, prediction, meta, lang, strings }: GeneDetailPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Locale-aware percentage formatter, rebuilt only when `lang` changes —
  // reused for every network row plus the ensemble marker on every render.
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { style: 'percent', maximumFractionDigits: 1 }),
    [lang],
  );

  const trueLabelText =
    prediction.true === 1
      ? strings['gene-explorer.true-driver']
      : prediction.true === 0
        ? strings['gene-explorer.true-passenger']
        : strings['gene-explorer.true-unlabeled'];
  const trueAccentVar =
    prediction.true === 1
      ? 'var(--series-driver)'
      : prediction.true === 0
        ? 'var(--series-passenger)'
        : 'var(--series-unlabeled)';

  const driverVotes = meta.ensembleNetworks.reduce((count, networkKey) => {
    const value = prediction.networks[networkKey];
    return value !== null && value !== undefined && value >= 0.5 ? count + 1 : count;
  }, 0);
  const majorityIsDriver = prediction.ensembleMajority === 1;

  const ensembleAvgText =
    prediction.ensembleAvg === null
      ? strings['gene-explorer.ensemble-avg-unavailable']
      : percentFormatter.format(prediction.ensembleAvg);

  // D3 owns this <div>'s subtree entirely (it is never given JSX children
  // and Preact never re-renders into it) — the standard fix for D3 and a
  // vdom library fighting over the same DOM nodes.
  useEffect(() => {
    if (!chartRef.current) return;

    const options: GeneLollipopOptions = {
      rootAriaLabel: interpolate(strings['gene-explorer.chart-root-aria-template'], { gene }),
      formatProbability: (value) => percentFormatter.format(value),
      formatNetworkAria: (networkLabel, formattedValue) =>
        interpolate(strings['gene-explorer.chart-value-aria-template'], {
          network: networkLabel,
          value: formattedValue,
        }),
      formatAbsentAria: (networkLabel) =>
        interpolate(strings['gene-explorer.chart-absent-aria-template'], { network: networkLabel }),
      formatEnsembleAria: (formattedValue) =>
        interpolate(strings['gene-explorer.chart-ensemble-aria-template'], { value: formattedValue }),
      notAvailableLabel: strings['gene-explorer.chart-tooltip-not-available'],
      ensembleAverageLabel: strings['gene-explorer.chart-legend-ensemble'],
    };

    const datum: GeneLollipopDatum = {
      networkOrder: meta.networks,
      networkValues: prediction.networks,
      ensembleAvg: prediction.ensembleAvg,
    };

    renderGeneLollipop(chartRef.current, datum, options);
  }, [gene, prediction, meta, strings, percentFormatter]);

  return (
    <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '1rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>
        {interpolate(strings['gene-explorer.detail-heading-template'], { gene })}
      </h4>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1rem' }}>
        <div>
          <div style={labelTextStyle}>{strings['gene-explorer.true-label-heading']}</div>
          <span style={badgeStyle}>
            <span aria-hidden="true" style={{ ...dotSwatchStyle, background: trueAccentVar }} />
            {trueLabelText}
          </span>
        </div>
        <div>
          <div style={labelTextStyle}>{strings['gene-explorer.ensemble-avg-label']}</div>
          <span style={valueTextStyle}>{ensembleAvgText}</span>
        </div>
        <div>
          <div style={labelTextStyle}>
            {interpolate(strings['gene-explorer.majority-template'], {
              count: String(driverVotes),
              total: String(meta.ensembleNetworks.length),
            })}
          </div>
          <span style={badgeStyle}>
            <span
              aria-hidden="true"
              style={{
                ...dotSwatchStyle,
                background: majorityIsDriver ? 'var(--series-driver)' : 'var(--series-passenger)',
              }}
            />
            {majorityIsDriver
              ? strings['gene-explorer.majority-verdict-driver']
              : strings['gene-explorer.majority-verdict-passenger']}
          </span>
        </div>
      </div>

      <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
        {strings['gene-explorer.chart-heading']}
      </h5>
      <div ref={chartRef} />

      <ul style={legendListStyle}>
        <li style={legendItemStyle}>
          <span aria-hidden="true" style={{ ...dotSwatchStyle, background: 'var(--series-driver)' }} />
          {strings['gene-explorer.chart-legend-driver']}
        </li>
        <li style={legendItemStyle}>
          <span aria-hidden="true" style={{ ...dotSwatchStyle, background: 'var(--series-passenger)' }} />
          {strings['gene-explorer.chart-legend-passenger']}
        </li>
        <li style={legendItemStyle}>
          <span aria-hidden="true" style={hollowSwatchStyle} />
          {strings['gene-explorer.chart-legend-absent']}
        </li>
        <li style={legendItemStyle}>
          <span aria-hidden="true" style={diamondSwatchStyle} />
          {strings['gene-explorer.chart-legend-ensemble']}
        </li>
      </ul>
    </div>
  );
}

export default function GeneExplorer({ lang, strings }: GeneExplorerProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [dataset, setDataset] = useState<GeneDataset | null>(null);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedGene, setSelectedGene] = useState<string | null>(null);

  // Fetches the dataset exactly once. BASE_URL is Astro's configured `base`
  // (e.g. "/mestrado_dissertacao" on GitHub Pages) and is NOT guaranteed to
  // end with a slash, so it is normalized here first — same rule this
  // project's src/i18n/utils.ts already enforces for the same reason.
  // Hardcoding "/data/..." or a relative "data/..." would 404 once deployed
  // under that subpath even though it works fine in local dev.
  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const url = `${base}data/gene-predictions.json`;

    setStatus('loading');
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load gene data: HTTP ${res.status}`);
        return res.json() as Promise<GeneDataset>;
      })
      .then((json) => {
        if (cancelled) return;
        setDataset(json);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Built exactly once per dataset load (sorting ~19,600 symbols is the only
  // O(n log n) pass ever paid). Every keystroke after that is a pair of
  // binary searches over this array (O(log n)), not a fresh O(n)
  // filter/scan — the difference between an instant-feeling combobox and
  // one that jank on every key with ~19,600 candidates.
  const sortedSymbols = useMemo(() => {
    if (!dataset) return [] as string[];
    return Object.keys(dataset.genes).sort();
  }, [dataset]);

  const { visibleSymbols, totalMatches } = useMemo(() => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed || sortedSymbols.length === 0) {
      return { visibleSymbols: [] as string[], totalMatches: 0 };
    }
    // All symbols sharing a prefix are contiguous in a sorted array, so the
    // whole prefix range — start, end, and thus exact count — comes from
    // two binary searches, never a linear scan over the full symbol list.
    const start = bisectLeft(sortedSymbols, trimmed);
    const end = bisectLeft(sortedSymbols, prefixUpperBound(trimmed));
    return {
      visibleSymbols: sortedSymbols.slice(start, Math.min(end, start + SUGGESTION_LIMIT)),
      totalMatches: Math.max(0, end - start),
    };
  }, [query, sortedSymbols]);

  function selectGene(symbol: string): void {
    if (!dataset || !dataset.genes[symbol]) return;
    setSelectedGene(symbol);
    setQuery(symbol);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }

  const selectedPrediction = selectedGene && dataset ? (dataset.genes[selectedGene] ?? null) : null;
  const activeOptionId =
    showSuggestions && highlightedIndex >= 0 && visibleSymbols[highlightedIndex]
      ? `gene-explorer-option-${visibleSymbols[highlightedIndex]}`
      : undefined;

  return (
    <div class="viz-canvas" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ margin: '0 0 0.35rem' }}>{strings['gene-explorer.title']}</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          {strings['gene-explorer.intro']}
        </p>
      </div>

      {status === 'loading' && <p role="status">{strings['gene-explorer.loading']}</p>}
      {status === 'error' && (
        <p role="alert" style={{ color: 'var(--series-driver)' }}>
          {strings['gene-explorer.error']}
        </p>
      )}

      {status === 'ready' && (
        <>
          <div style={{ position: 'relative' }}>
            <label
              for="gene-explorer-search-input"
              style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}
            >
              {strings['gene-explorer.search-label']}
            </label>
            <input
              id="gene-explorer-search-input"
              type="text"
              role="combobox"
              aria-expanded={showSuggestions && visibleSymbols.length > 0}
              aria-controls="gene-explorer-listbox"
              aria-autocomplete="list"
              aria-describedby="gene-explorer-combobox-instructions"
              aria-activedescendant={activeOptionId}
              autocomplete="off"
              placeholder={strings['gene-explorer.search-placeholder']}
              value={query}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
              }}
              onInput={(event) => {
                const value = (event.currentTarget as HTMLInputElement).value;
                setQuery(value);
                setShowSuggestions(value.trim().length > 0);
                setHighlightedIndex(-1);
              }}
              onFocus={() => {
                if (query.trim().length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Deferred so a suggestion's onMouseDown (which also
                // preventDefault()s) still fires before the list unmounts.
                window.setTimeout(() => setShowSuggestions(false), 100);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setShowSuggestions(true);
                  setHighlightedIndex((i) => Math.min(i + 1, visibleSymbols.length - 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setHighlightedIndex((i) => Math.max(i - 1, 0));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  if (highlightedIndex >= 0 && visibleSymbols[highlightedIndex]) {
                    selectGene(visibleSymbols[highlightedIndex]);
                  } else {
                    const exact = query.trim().toUpperCase();
                    if (dataset?.genes[exact]) selectGene(exact);
                    else if (visibleSymbols[0]) selectGene(visibleSymbols[0]);
                  }
                } else if (event.key === 'Escape') {
                  setShowSuggestions(false);
                  setHighlightedIndex(-1);
                }
              }}
            />
            <span id="gene-explorer-combobox-instructions" style={visuallyHiddenStyle}>
              {strings['gene-explorer.combobox-instructions']}
            </span>

            {showSuggestions && (
              <ul
                id="gene-explorer-listbox"
                role="listbox"
                aria-label={strings['gene-explorer.results-listbox-label']}
                style={{
                  listStyle: 'none',
                  margin: '0.25rem 0 0',
                  padding: '0.25rem',
                  position: 'absolute',
                  zIndex: 5,
                  width: '100%',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {visibleSymbols.length === 0 && (
                  <li
                    role="presentation"
                    style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}
                  >
                    {strings['gene-explorer.no-results']}
                  </li>
                )}
                {visibleSymbols.map((symbol, index) => (
                  <li
                    key={symbol}
                    id={`gene-explorer-option-${symbol}`}
                    role="option"
                    aria-selected={index === highlightedIndex}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: index === highlightedIndex ? 'var(--gridline)' : 'transparent',
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectGene(symbol);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {symbol}
                  </li>
                ))}
                {totalMatches > visibleSymbols.length && (
                  <li
                    role="presentation"
                    style={{ padding: '0.3rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}
                  >
                    {interpolate(strings['gene-explorer.more-results-template'], {
                      count: String(totalMatches - visibleSymbols.length),
                    })}
                  </li>
                )}
              </ul>
            )}
          </div>

          {!selectedGene && (
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>
                {strings['gene-explorer.examples-label']}
              </span>
              {EXAMPLE_GENES.map((example) => (
                <button
                  key={example.symbol}
                  type="button"
                  title={strings[example.hintKey]}
                  style={chipButtonStyle}
                  onClick={() => selectGene(example.symbol)}
                >
                  {example.symbol}
                </button>
              ))}
            </div>
          )}

          {selectedGene && selectedPrediction && dataset && (
            <GeneDetailPanel
              gene={selectedGene}
              prediction={selectedPrediction}
              meta={dataset.meta}
              lang={lang}
              strings={strings}
            />
          )}
        </>
      )}
    </div>
  );
}
