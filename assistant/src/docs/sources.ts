/**
 * Where the doc tools read from. These are product facts about NetBird's public
 * docs, not per-deployment config, so they live in code — but every fetch is
 * still constrained by FETCH_HOST_ALLOWLIST (SSRF guard) below.
 *
 * Docs pages (docs.netbird.io) are authored as MDX under `src/pages/` in
 * github.com/netbirdio/docs, mirrored 1:1 to the sitemap. fetch.ts resolves a
 * doc URL to its raw MDX (clean text, no HTML) and only falls back to scraping
 * the rendered page for generated sections (e.g. /api/*) that have no source file.
 */

/** Public docs host (MDX-backed, resolvable to GitHub raw). */
export const DOCS_HOST = "docs.netbird.io";
/** Marketing site host; the knowledge hub lives here (rendered HTML only). */
export const SITE_HOST = "netbird.io";

/** Raw MDX root: <GITHUB_RAW_BASE>/<sitemap-path>.mdx (or /index.mdx for sections). */
export const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/netbirdio/docs/main/src/pages";
export const GITHUB_RAW_HOST = "raw.githubusercontent.com";

/** The NetBird management REST API OpenAPI spec (source for the api-reference tool). */
export const OPENAPI_URL =
  "https://raw.githubusercontent.com/netbirdio/netbird/main/shared/management/http/api/openapi.yml";

/**
 * Hosts fetch_doc is allowed to retrieve. The model may only pass docs.netbird.io
 * / netbird.io URLs; raw.githubusercontent.com is reached only via URLs this
 * module derives internally. Anything else is rejected before a request is made.
 */
export const FETCH_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  DOCS_HOST,
  SITE_HOST,
  GITHUB_RAW_HOST,
]);

/** Hosts the model is permitted to name in a fetch_doc call. */
export const PUBLIC_HOST_ALLOWLIST: ReadonlySet<string> = new Set([DOCS_HOST, SITE_HOST]);

/** A sitemap to seed the search catalog, plus a filter for which URLs to keep. */
export interface SitemapSource {
  url: string;
  /** Keep only URLs matching this predicate (the whole product docs, or a subtree). */
  include: (url: string) => boolean;
}

/**
 * Catalog seeds. All of docs.netbird.io; from the marketing sitemap only the
 * knowledge hub (the rest is landing pages, not answerable content).
 */
export const SITEMAPS: readonly SitemapSource[] = [
  { url: `https://${DOCS_HOST}/sitemap.xml`, include: () => true },
  {
    url: `https://${SITE_HOST}/sitemap-0.xml`,
    include: (u) => u.includes("/knowledge-hub"),
  },
];
