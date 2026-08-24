import { z } from "zod";
import { defineTool, type ServerToolResult } from "@/agent/tools/_contract.ts";
import { searchCatalog } from "@/lib/docs.ts";

const SearchInput = z.object({
  query: z
    .string()
    .min(1)
    .max(400)
    .describe("Keywords describing what to find, e.g. 'split DNS setup keys'."),
  limit: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .describe("Max results (optional; default is server-configured)."),
});

// Rank public documentation pages against a query.
export default defineTool({
  runtime: "server",
  cache: true,
  description:
    "Search the public NetBird documentation and knowledge hub for pages relevant to a topic. " +
    "Call this for how-to, concept, configuration, self-hosting, or troubleshooting questions — " +
    "anything answered by the docs rather than the user's own account data. Returns a ranked list " +
    "of {title, section, url}; follow up with fetch_doc to read a page before answering, and cite its URL.",
  input: SearchInput,
  execute: runSearchDocs,
});

async function runSearchDocs({ query, limit }: z.output<typeof SearchInput>): Promise<ServerToolResult> {
  const hits = await searchCatalog(query, limit);
  if (hits.length === 0) {
    return {
      ok: true,
      content: `No documentation pages matched "${query}". Try different keywords.`,
      summary: `No docs matched "${query}"`,
    };
  }
  const lines = hits.map((h) => `- ${h.title} [${h.section}] — ${h.url}`).join("\n");
  return {
    ok: true,
    content: `Documentation pages matching "${query}":\n${lines}\n\nCall fetch_doc with a URL to read one.`,
    summary: `Searched docs for "${query}" — ${hits.length} result${hits.length === 1 ? "" : "s"}`,
  };
}
