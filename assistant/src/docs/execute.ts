/**
 * Server-side execution of the doc tools. The chat loop calls `runDocTool` when
 * the model requests `search_docs` / `fetch_doc`, feeds the result back as a
 * tool_result, and loops — no caller round-trip (these hit only public pages).
 *
 * The returned `summary` is a short human line the chat route streams to the UI
 * as progress ("Searching docs …", "Read <title>"); `content` is the tool_result
 * text the model sees.
 */
import { z } from "zod";
import { searchDocs } from "@/docs/catalog.ts";
import { fetchDoc, DocFetchError } from "@/docs/fetch.ts";

export interface DocToolResult {
  /** false → returned as an error tool_result so the model can recover. */
  ok: boolean;
  /** tool_result content shown to the model. */
  content: string;
  /** One-line progress summary for the UI. */
  summary: string;
  /**
   * Side-channel SSE event, forwarded by the chat route. A page the model
   * actually read is a citation whether or not it remembers to write the URL,
   * so `fetch_doc` reports it rather than trusting the answer to.
   */
  emit?: { event: string; data: unknown };
}

const SearchInput = z.object({
  query: z.string().min(1).max(400),
  limit: z.number().int().positive().max(20).optional(),
});
const FetchInput = z.object({ url: z.string().min(1).max(2048) });

/** Bare host for the citation chip: `docs.netbird.io`, not the whole URL. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "netbird.io";
  }
}

export function isDocTool(name: string): boolean {
  return name === "search_docs" || name === "fetch_doc";
}

async function runSearch(input: unknown): Promise<DocToolResult> {
  const parsed = SearchInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, content: "invalid input: search_docs needs a non-empty `query`.", summary: "search rejected" };
  }
  const { query, limit } = parsed.data;
  const hits = await searchDocs(query, limit);
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

async function runFetch(input: unknown): Promise<DocToolResult> {
  const parsed = FetchInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, content: "invalid input: fetch_doc needs a `url`.", summary: "fetch rejected" };
  }
  try {
    const doc = await fetchDoc(parsed.data.url);
    const note = doc.truncated ? " (truncated)" : "";
    return {
      ok: true,
      content: `# ${doc.title}\nSource: ${doc.url}${note}\n\n${doc.text}`,
      summary: `Read ${doc.title}`,
      emit: {
        event: "source",
        data: { url: doc.url, title: doc.title, domain: hostOf(doc.url) },
      },
    };
  } catch (err) {
    const msg = err instanceof DocFetchError ? err.message : "failed to fetch the page";
    return { ok: false, content: `Could not fetch that page: ${msg}`, summary: "Fetch failed" };
  }
}

/** Execute a doc tool by name. `isDocTool` must be true for `name`. */
export async function runDocTool(name: string, input: unknown): Promise<DocToolResult> {
  if (name === "search_docs") return runSearch(input);
  if (name === "fetch_doc") return runFetch(input);
  return { ok: false, content: `unknown doc tool: ${name}`, summary: "unknown tool" };
}
