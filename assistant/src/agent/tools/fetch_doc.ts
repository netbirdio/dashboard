import { z } from "zod";
import { defineTool, type ServerToolResult } from "@/agent/tools/_contract.ts";
import { DocFetchError, fetchDoc } from "@/lib/docs.ts";

const FetchInput = z.object({
  url: z
    .string()
    .min(1)
    .max(2048)
    .describe("The docs.netbird.io or netbird.io page URL to read."),
});

// Read one documentation page as plain text, mdx first.
export default defineTool({
  runtime: "server",
  cache: true,
  description:
    "Fetch the full text of one NetBird documentation or knowledge-hub page by URL (as returned by " +
    "search_docs). Only https://docs.netbird.io/… and https://netbird.io/… URLs are allowed. Read the " +
    "page before answering a docs question, and cite the URL in your answer.",
  input: FetchInput,
  execute: runFetchDoc,
});

// The dashboard's source list shows a bare domain.
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "netbird.io";
  }
}

async function runFetchDoc({ url }: z.output<typeof FetchInput>): Promise<ServerToolResult> {
  try {
    const doc = await fetchDoc(url);
    const note = doc.truncated ? " (truncated)" : "";
    return {
      ok: true,
      content: `# ${doc.title}\nSource: ${doc.url}${note}\n\n${doc.text}`,
      summary: `Read ${doc.title}`,
      source: { url: doc.url, title: doc.title, domain: hostOf(doc.url) },
    };
  } catch (err) {
    const msg = err instanceof DocFetchError ? err.message : "failed to fetch the page";
    return { ok: false, content: `Could not fetch that page: ${msg}`, summary: "Fetch failed" };
  }
}
