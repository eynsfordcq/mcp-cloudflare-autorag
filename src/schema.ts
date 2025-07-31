import { z } from "zod";

export const AutoRagSearchRequestSchema = z.object({
  query: z.string().describe("the search query."),
});

const AutoRagSearchResultDataSchema = z.object({
  score: z.number(),
  attributes: z.record(z.string(), z.any()).nullable().optional(),
  content: z
    .array(
      z.object({
        text: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  file_id: z.string().nullable().optional(),
  filename: z.string().nullable().optional(),
});

const AutoRagSearchResultSchema = z.object({
  search_query: z.string(),
  data: z.array(AutoRagSearchResultDataSchema).nullable().optional(),
  has_more: z.boolean().nullable().optional(),
  next_page: z.string().nullable().optional(),
  object: z.string().nullable().optional(),
});

export const AutoRagSearchResponseSchema = z.object({
  success: z.boolean(),
  result: AutoRagSearchResultSchema,
});
