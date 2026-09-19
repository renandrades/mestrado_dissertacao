import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const sectionSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  order: z.number(),
  chartId: z.string().nullable().default(null),
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
