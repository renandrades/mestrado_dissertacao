import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://renandrades.github.io',
  base: '/mestrado_dissertacao',
  integrations: [mdx(), preact()],
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
