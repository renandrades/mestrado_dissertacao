#!/usr/bin/env node
/**
 * Merges the per-PPI-network gene prediction CSVs (real output of the
 * dissertation's trained GCN models, one file per network) into a single
 * JSON keyed by gene symbol, for the Gene Explorer.
 *
 * This is an authoring-time script, not a build step: the underlying
 * predictions are final results from a completed master's dissertation and
 * will not change. Run it manually (`node scripts/build-gene-data.mjs`)
 * whenever data-source/predict/*.csv changes, and commit the regenerated
 * public/data/gene-predictions.json.
 *
 * Ensemble rule replicated verbatim from the dissertation's own analysis
 * notebook (ensemble_approach/extract_predictions.ipynb):
 *   - ensembleAvg: mean of the six literature networks' predicted
 *     probability for that gene, averaged ONLY over networks that actually
 *     contain the gene (a smaller network like HPRD simply has no row for
 *     genes outside it — pandas' groupby(...).mean() skips missing rows
 *     rather than treating them as 0, and this script does the same).
 *   - ensembleMajority: 1 if at least 3 of the 6 literature networks
 *     predict the gene as a driver (binary == 1) at their own 0.5
 *     threshold, else 0 (ties at 3-of-6 count as positive, matching
 *     `soma['Predicted'].where(... > 2, 0).where(... < 3, 1)` in the
 *     notebook).
 * The UNION network ("unity") is NOT part of the ensemble average/majority
 * — the dissertation treats it as a separate, competing single-network
 * approach — but its own prediction is still exposed per gene like any
 * other network, for the explorer UI to show alongside the ensemble.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, '..', 'data-source', 'predict');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'gene-predictions.json');

// Networks that participate in the ensemble average/majority vote.
const ENSEMBLE_NETWORKS = ['hprd', 'multinet', 'iref', 'cpdb', 'pcnet', 'string'];
// All networks exposed per gene, ensemble ones plus the standalone UNION network.
const ALL_NETWORKS = [...ENSEMBLE_NETWORKS, 'union'];

const FILE_BY_NETWORK = {
  hprd: 'all_predictions_hprd.csv',
  multinet: 'all_predictions_multinet.csv',
  iref: 'all_predictions_iref.csv',
  cpdb: 'all_predictions_cpdb.csv',
  pcnet: 'all_predictions_pcnet.csv',
  string: 'all_predictions_string.csv',
  union: 'all_predictions_unity.csv',
};

function parseCsv(text) {
  const lines = text.split('\n').filter((line) => line.length > 0);
  const header = lines[0].split(',');
  const geneIdx = header.indexOf('gene');
  const percentIdx = header.indexOf('percent');
  const binaryIdx = header.indexOf('binary');
  const trueIdx = header.indexOf('true');
  if (geneIdx === -1 || percentIdx === -1 || binaryIdx === -1 || trueIdx === -1) {
    throw new Error(`Unexpected CSV header: ${header.join(',')}`);
  }
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',');
    rows.push({
      gene: cols[geneIdx].trim(),
      percent: Number(cols[percentIdx]),
      binary: Number(cols[binaryIdx]),
      true: Number(cols[trueIdx]),
    });
  }
  return rows;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

const genes = new Map();

function getOrCreate(gene) {
  let entry = genes.get(gene);
  if (!entry) {
    entry = { true: null, networks: Object.fromEntries(ALL_NETWORKS.map((n) => [n, null])) };
    genes.set(gene, entry);
  }
  return entry;
}

for (const network of ALL_NETWORKS) {
  const file = path.join(SOURCE_DIR, FILE_BY_NETWORK[network]);
  const rows = parseCsv(readFileSync(file, 'utf8'));
  for (const row of rows) {
    const entry = getOrCreate(row.gene);
    entry.networks[network] = round3(row.percent);
    if (entry.true === null) entry.true = row.true;
  }
}

// Ensemble average/majority, computed only from the 6 literature networks,
// only over networks where the gene actually has a prediction.
for (const entry of genes.values()) {
  const values = ENSEMBLE_NETWORKS.map((n) => entry.networks[n]).filter((v) => v !== null);
  if (values.length === 0) {
    entry.ensembleAvg = null;
    entry.ensembleMajority = null;
    continue;
  }
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  entry.ensembleAvg = round3(avg);
  const votes = values.filter((v) => v >= 0.5).length;
  entry.ensembleMajority = votes >= 3 ? 1 : 0;
}

// Sanity check: every gene should come from the union network (it's the
// merge of all six literature networks' nodes), so the total gene count
// must equal the UNION file's row count — a mismatch would mean some
// network introduced genes UNION doesn't have, which shouldn't happen.
const unionRows = parseCsv(readFileSync(path.join(SOURCE_DIR, FILE_BY_NETWORK.union), 'utf8'));
if (unionRows.length !== genes.size) {
  throw new Error(
    `Gene count mismatch: merged ${genes.size} genes but UNION network has ${unionRows.length} rows. ` +
      'Check for stray whitespace/case differences in gene symbols across the source CSVs.',
  );
}

const output = {
  meta: {
    networks: ALL_NETWORKS,
    ensembleNetworks: ENSEMBLE_NETWORKS,
    geneCount: genes.size,
  },
  genes: Object.fromEntries(genes),
};

mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(output));

console.log(`Wrote ${genes.size} genes to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
