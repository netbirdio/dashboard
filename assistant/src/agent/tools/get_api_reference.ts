import { z } from "zod";
import { defineTool, type ServerToolResult } from "@/agent/tools/_contract.ts";
import { FETCH_MAX_BYTES } from "@/lib/docs.ts";
import { loadOpenApiIndex, queryOpenApi } from "@/lib/openapi.ts";

const ApiReferenceInput = z.object({
  query: z
    .string()
    .min(1)
    .max(400)
    .describe("A resource or endpoint, e.g. 'peers', 'create policy', 'nameserver group'."),
});

// Endpoints and schemas from the management OpenAPI spec.
export default defineTool({
  runtime: "server",
  cache: true,
  description:
    "Look up the NetBird REST API reference (endpoints and request/response schemas) from the " +
    "official OpenAPI spec. Call this for questions about the API itself — what an endpoint " +
    "returns, which fields exist, how to call it. Not for the user's own data (use the account tools).",
  input: ApiReferenceInput,
  execute: runApiReference,
});

async function runApiReference({ query }: z.output<typeof ApiReferenceInput>): Promise<ServerToolResult> {
  try {
    const index = await loadOpenApiIndex();
    const body = queryOpenApi(index, query, FETCH_MAX_BYTES);
    if (!body) {
      return { ok: true, content: `No API endpoints or schemas matched "${query}".`, summary: `No API match for "${query}"` };
    }
    return { ok: true, content: `NetBird API reference for "${query}":\n\n${body}`, summary: `API reference: "${query}"` };
  } catch {
    return { ok: false, content: "Could not load the API reference right now.", summary: "API reference unavailable" };
  }
}
