import { z } from "zod";

export const AutoRagSearchRequestSchema = z.object({
  query: z.string().describe("the search query."),
  rewrite_query: z
    .boolean()
    .optional()
    .describe("rewrite query for better retrieval accuracy."),
  max_num_results: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("maximum number of results to return (1-20)."),
  score_threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("minimum score for a result to be considered a match (0-1)."),
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
