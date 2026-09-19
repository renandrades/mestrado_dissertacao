# Dissertation site

Scrollytelling site for the dissertation *"Prediction of Cancer Driver Genes with
Graph Neural Networks"* (UFRGS, 2023). Built with Astro + MDX + D3, bilingual
(PT/EN). Deployed automatically to GitHub Pages from this folder — see
`../.github/workflows/pages.yml`.

Live at: https://renandrades.github.io/mestrado_dissertacao/

## Requirements

Node.js >= 20.19 (the project was built and tested on Node 22 LTS).

## Commands

| Command | Action |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server |
| `npm run build` | Type-check and build the static site to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run Astro/TypeScript diagnostics only |

`astro.config.mjs` sets `base: '/mestrado_dissertacao'` to match the GitHub Pages
project URL. Because of this, `npm run dev`/`npm run preview` serve the site under
that same path locally too — e.g. http://localhost:4321/mestrado_dissertacao/pt/,
not http://localhost:4321/pt/.

## Structure

- `src/content/sections/{pt,en}/*.mdx` — narrative text per scrolly section.
- `src/charts/*.config.ts` — chart data (no language strings).
- `src/components/scrolly/` — the scroll-driven layout mechanism.
- `src/components/charts/` — D3 render functions + chart mount/registry.
- `src/i18n/` — UI strings and locale helpers.
