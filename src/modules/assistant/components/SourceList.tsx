/**
 * The pages behind an answer: a collapsed pill that opens into cards.
 *
 * Sources are reported by the server when `fetch_doc` actually reads a page —
 * not scraped from the answer's links — so the list says what the assistant
 * consulted even where it paraphrased without citing. Shaped after
 * assistant-ui's `Sources` element: a count pill, then a two-column grid of
 * domain + title.
 *
 * Split into a group and a card because that's how the parts arrive: adjacent
 * `source` parts coalesce into one group node (the pill), and each part renders
 * itself inside it (a card).
 */
"use client";

import { cn } from "@utils/helpers";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

/** `docs.netbird.io` from a URL, or the raw string if it isn't one. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceGroup({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-nb-gray-800 bg-nb-gray-900 py-1 pl-2.5 pr-2 text-chat text-nb-gray-300 transition-colors hover:border-nb-gray-700 hover:text-nb-gray-100"
      >
        Sources
        <span className="rounded-full bg-nb-gray-850 px-1.5 text-[11px] tabular-nums text-nb-gray-300">
          {count}
        </span>
        <ChevronRight
          size={13}
          className={cn("transition-transform", open && "rotate-90")}
        />
      </button>

      {open && <div className="mt-2 grid grid-cols-2 gap-2">{children}</div>}
    </div>
  );
}

export function SourceCard({
  url,
  title,
}: {
  url: string;
  /** Empty when the page didn't give one — the domain stands in. */
  title: string;
}) {
  const domain = domainOf(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex flex-col gap-1 rounded-lg border border-nb-gray-800 bg-nb-gray-900 px-3 py-2 transition-colors hover:border-nb-gray-700"
    >
      <span className="flex items-center gap-1.5">
        {/* The initial stands in for a favicon: fetching one would mean an
            outbound request per source, from the dashboard, to a third party. */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-nb-gray-850 text-[10px] uppercase text-nb-gray-300">
          {domain.charAt(0)}
        </span>
        <span className="min-w-0 truncate font-mono text-[11px] text-nb-gray-400">
          {domain}
        </span>
      </span>
      <span className="line-clamp-2 text-chat text-nb-gray-200">
        {title || domain}
      </span>
    </a>
  );
}
