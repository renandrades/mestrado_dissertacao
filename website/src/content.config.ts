import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const sectionSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  order: z.number(),
  chartId: z.string().nullable().default(null),
  /**
   * "paired" (default): the standard two-column scrollytelling treatment,
   * narrative text sharing a sticky chart column with adjacent "paired"
   * sections. "full": a standalone, full-width block with no sticky chart
   * — for sections that need more room than a chart-paired column allows
   * (e.g. the interactive gene explorer, or a closing/access section).
   *
   * Named "arrangement", not "layout": Astro's MDX integration reserves
   * the literal frontmatter key `layout` (it tries to import its value as
   * a page-layout component module), so a plain enum field with that name
   * breaks the build ("Rolldown failed to resolve import 'full'") even
   * though `astro check` doesn't catch it (that failure only happens at
   * Vite/Rolldown bundling time).
   */
  arrangement: z.enum(['paired', 'full']).default('paired'),
});

const sectionsPt = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/sections/pt' }),
  schema: sectionSchema,
});

const sectionsEn = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/sections/en' }),
  schema: sectionSchema,
});

export const collections = { sectionsPt, sectionsEn };
