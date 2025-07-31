import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  AutoRagSearchRequestSchema,
  AutoRagSearchResponseSchema,
} from "./schema.js";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_AUTORAG_ID = process.env.CLOUDFLARE_AUTORAG_ID;
const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4";

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_AUTORAG_ID) {
  console.error(
    "CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AUTORAG_ID environment variables are required.",
  );
  process.exit(1);
}

async function autoragSearch(query: string) {
  const url = `${CLOUDFLARE_API_URL}/accounts/${CLOUDFLARE_ACCOUNT_ID}/autorag/rags/${CLOUDFLARE_AUTORAG_ID}/search`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
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
        name: "autorag_search",
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
