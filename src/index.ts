import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  AutoRagSearchRequestSchema,
  AutoRagSearchResponseSchema,
} from "./schema.js";

const EnvSchema = z.object({
  CLOUDFLARE_API_TOKEN: z.string(),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_AUTORAG_ID: z.string(),
  REWRITE_QUERY: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  MAX_NUM_RESULTS: z.coerce.number().int().min(1).max(20).default(10),
  SCORE_THRESHOLD: z.coerce.number().int().min(0).max(1).default(0),
});

const env = EnvSchema.parse(process.env);
const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4";

const server = new Server(
  {
    name: "mcp-cloudflare-autorag",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

async function autoragSearch(query: string) {
  const url = `${CLOUDFLARE_API_URL}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/autorag/rags/${env.CLOUDFLARE_AUTORAG_ID}/search`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Cloudflare API error: ${response.statusText} - ${errorBody}`,
    );
  }

  const data = await response.json();
  return AutoRagSearchResponseSchema.parse(data);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_autorag",
        description:
          "Search the configured Cloudflare AutoRAG instance for relevant information.",
        inputSchema: zodToJsonSchema(AutoRagSearchRequestSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }
    switch (request.params.name) {
      case "autorag_search": {
        const args = AutoRagSearchRequestSchema.parse(request.params.arguments);
        const results = await autoragSearch(args.query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results),
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cloudflare AutoRAG MCP Server Running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
