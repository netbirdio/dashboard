/**
 * Markdown renderer for assistant text.
 *
 * Two deliberate choices:
 *  - Raw HTML is **not** enabled (no rehype-raw). Model output is untrusted;
 *    react-markdown escapes HTML by default and we keep it that way.
 *  - Placeholder tokens are restored to real names here, at the last possible
 *    moment. The model and server only ever saw `{PEER_1}`; the user sees the
 *    device's actual name.
 */
"use client";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  type SyntaxHighlighterProps,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { cn } from "@utils/helpers";
import bash from "highlight.js/lib/languages/bash";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import json from "highlight.js/lib/languages/json";
import nginx from "highlight.js/lib/languages/nginx";
import powershell from "highlight.js/lib/languages/powershell";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import remarkGfm from "remark-gfm";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { useRestorePlaceholders } from "../privacy/RedactorContext";

/**
 * Languages registered by hand rather than lowlight's `common` bundle: this
 * pulls each grammar into the dashboard's own bundle, so the list is exactly
 * what a NetBird answer contains — install commands, config files, API payloads
 * and the odd bit of client code. Anything else falls back to plain text, which
 * is what an un-highlighted block already looked like.
 */
const LANGUAGES = {
  bash,
  dockerfile,
  go,
  ini,
  json,
  nginx,
  powershell,
  python,
  typescript,
  yaml,
};

/** The aliases a model actually writes on a fence, mapped to the above. */
const ALIASES: Record<string, (typeof LANGUAGES)[keyof typeof LANGUAGES]> = {
  sh: bash,
  shell: bash,
  zsh: bash,
  console: bash,
  ps1: powershell,
  pwsh: powershell,
  conf: ini,
  toml: ini,
  yml: yaml,
  ts: typescript,
  js: typescript,
  golang: go,
  py: python,
};

const headingClass =
  "mb-1.5 mt-5 text-sm font-semibold text-nb-gray-100 first:mt-0";

/**
 * Block spacing is set here, element by element, because Tailwind's preflight
 * zeroes the browser's default margins: without these the model's paragraphs,
 * lists and headings all run together into one block of text.
 */
const lowlight = createLowlight({ ...LANGUAGES, ...ALIASES });

/**
 * Same element for inline code and fenced blocks, and only the inline one wants
 * a chip background. Which is which comes from the primitive rather than from
 * the `language-*` class: a fence written without a language carries no such
 * class, and sniffing for it painted a chip *inside* the block — which is why
 * the body looked a different colour from its header.
 */
function Code({ className, ...props }: any) {
  const isBlock = useIsMarkdownCodeBlock();

  return (
    <code
      {...props}
      className={cn(
        "font-mono text-[0.95em] text-nb-gray-100",
        // The same fill and hairline as a code block or a table, so every
        // boxed thing in an answer is one surface — just at chip scale.
        !isBlock &&
          "rounded border border-nb-gray-850 bg-nb-gray-920 px-1 py-0.5",
        className,
      )}
    />
  );
}

/**
 * lowlight's hast → React. The tree is only ever nested `<span>`s carrying
 * `hljs-*` classes and text, so this is the whole renderer; the classes are
 * styled in `globals.css`.
 */
function renderHighlighted(node: any, key?: number): ReactNode {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return null;

  const className = Array.isArray(node.properties?.className)
    ? node.properties.className.join(" ")
    : undefined;

  return (
    <span key={key} className={className}>
      {node.children?.map((child: any, index: number) =>
        renderHighlighted(child, index),
      )}
    </span>
  );
}

/**
 * Highlighting runs here rather than as a rehype plugin on purpose. A plugin
 * rewrites the code text into a span tree, and the primitive only renders
 * `CodeHeader` for a block whose child is a plain string — so every highlighted
 * block quietly lost its language label and copy button. This is the seam the
 * primitive provides for exactly this, and the header keeps working.
 */
function SyntaxHighlighter({
  language,
  code,
  components: { Pre, Code },
}: SyntaxHighlighterProps) {
  // Unregistered languages stay plain: guessing paints a two-line snippet as
  // whatever grammar scores highest, which is usually wrong.
  const tree = lowlight.registered(language)
    ? lowlight.highlight(language, code)
    : null;

  return (
    <Pre>
      <Code>
        {tree
          ? tree.children.map((child, index) => renderHighlighted(child, index))
          : code}
      </Code>
    </Pre>
  );
}

/**
 * The bar on top of a fenced block: what language it is, and a way to take it.
 *
 * `MarkdownTextPrimitive` renders this immediately before the `pre` and hands
 * it the raw source, so copying doesn't have to scrape the DOM. Placeholders are
 * restored first — the clipboard should hold the command you can actually run,
 * not `{PEER_1}`.
 */
function CodeHeader({ language, code }: CodeHeaderProps) {
  // `code` is already restored — `preprocess` runs on the whole source before
  // it's parsed, so the clipboard gets the command you can actually run.
  //
  // Silent: the button turns into a ✓ right where the user clicked, and a
  // toast for every snippet in a long answer is a lot of toast.
  const [, copyToClipboard, copied] = useCopyToClipboard(code, {
    silent: true,
  });

  return (
    /* One box with the block below it: same fill, no rule between them, only
       the top corners rounded. The header is the block's first row, not a bar
       sitting on top of it — `.assistant-code-header + pre` in globals.css is
       what strips the seam, so the `pre` needs no knowledge of whether a
       header was rendered. */
    <div className="assistant-code-header mt-3 flex items-center justify-between gap-2 rounded-t-lg border border-b-0 border-nb-gray-850 bg-nb-gray-920 py-1 pl-3 pr-1.5">
      <span className="truncate font-mono text-[11px] text-nb-gray-400">
        {language && language !== "unknown" ? language : "code"}
      </span>
      <button
        type="button"
        aria-label="Copy code"
        title="Copy"
        onClick={() => copyToClipboard()}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-nb-gray-300 transition-colors hover:bg-nb-gray-850 hover:text-nb-gray-100"
      >
        {copied ? (
          <Check size={13} className="text-green-500" />
        ) : (
          <Copy size={13} />
        )}
      </button>
    </div>
  );
}

const components = {
  p: ({ className, ...props }: any) => (
    <p {...props} className={cn("my-3 first:mt-0 last:mb-0", className)} />
  ),
  /*
    Markers are drawn as `::before` rather than left to `list-disc` /
    `list-decimal`: a native ::marker takes no margin, so the gap to the text is
    whatever the browser decides. Absolute markers put that gap under our
    control — it's the item's `pl-*`.
  */
  ul: ({ className, ...props }: any) => (
    <ul
      {...props}
      className={cn(
        "my-3 list-none space-y-1.5 first:mt-0 last:mb-0",
        "[&>li]:relative [&>li]:pl-5",
        "[&>li]:before:absolute [&>li]:before:left-1 [&>li]:before:text-nb-gray-100 [&>li]:before:content-['•']",
        className,
      )}
    />
  ),
  ol: ({ className, ...props }: any) => (
    <ol
      {...props}
      className={cn(
        "my-3 list-none space-y-1.5 first:mt-0 last:mb-0",
        "[counter-reset:item] [&>li]:relative [&>li]:pl-5 [&>li]:[counter-increment:item]",
        "[&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:tabular-nums [&>li]:before:text-nb-gray-100 [&>li]:before:content-[counter(item)_'.']",
        className,
      )}
    />
  ),
  li: ({ className, ...props }: any) => (
    <li {...props} className={cn("[&>p]:my-0", className)} />
  ),
  // One heading scale for all levels: inside a panel this narrow the model's h1/h2/h3
  // nesting carries no useful hierarchy, and stepping the sizes just made the
  // deeper ones smaller than the body text.
  h1: ({ className, ...props }: any) => (
    <h2 {...props} className={cn(headingClass, className)} />
  ),
  h2: ({ className, ...props }: any) => (
    <h2 {...props} className={cn(headingClass, className)} />
  ),
  h3: ({ className, ...props }: any) => (
    <h3 {...props} className={cn(headingClass, className)} />
  ),
  h4: ({ className, ...props }: any) => (
    <h4 {...props} className={cn(headingClass, className)} />
  ),
  strong: ({ className, ...props }: any) => (
    <strong
      {...props}
      className={cn("font-semibold text-nb-gray-100", className)}
    />
  ),
  blockquote: ({ className, ...props }: any) => (
    <blockquote
      {...props}
      className={cn(
        "my-3 border-l-[3px] border-nb-gray-600 pl-4 text-nb-gray-300",
        className,
      )}
    />
  ),
  hr: ({ className, ...props }: any) => (
    <hr {...props} className={cn("my-6 border-nb-gray-800", className)} />
  ),
  // Everything the model cites is a docs page, so links open in a new tab and
  // say so. The icon is drawn only for absolute http(s) targets: a relative
  // link stays inside the dashboard and leaving the tab is the surprise, not
  // the norm.
  a: ({ className, children, href, ...props }: any) => (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      // `text-netbird`, matching the dashboard's own `InlineLink`: the panel
      // shouldn't have its own idea of what a link looks like.
      className={cn(
        "text-netbird underline underline-offset-4 hover:text-netbird-300",
        className,
      )}
    >
      {children}
      {typeof href === "string" && /^https?:\/\//i.test(href) && (
        <ExternalLink
          size={13}
          aria-hidden="true"
          className="ml-0.5 inline-block -translate-y-px"
        />
      )}
    </a>
  ),
  code: Code,
  // Styled as a standalone box; when a header *is* rendered above it, the
  // sibling rule in globals.css joins the two.
  pre: ({ className, ...props }: any) => (
    <pre
      {...props}
      className={cn(
        "my-3 overflow-x-auto rounded-lg border border-nb-gray-850 bg-nb-gray-920 p-3 pb-2 text-chat",
        className,
      )}
    />
  ),
  /*
    Shaped like the dashboard's own tables: no grid, just a rule under the
    header. One fill throughout, the same one a code block uses, so every boxed
    thing in an answer sits on the same surface. The frame is on the wrapper so
    the rounded corners actually clip the header — a border on the `table`
    can't, with `border-collapse`.
  */
  table: ({ className, ...props }: any) => (
    // Wide tables scroll inside their own frame rather than stretching the panel.
    <div className="my-3 overflow-x-auto rounded-lg border border-nb-gray-850 bg-nb-gray-920">
      <table
        {...props}
        className={cn("w-full border-collapse text-chat", className)}
      />
    </div>
  ),
  thead: ({ className, ...props }: any) => (
    <thead
      {...props}
      className={cn("border-b border-nb-gray-850 text-nb-gray-200", className)}
    />
  ),
  th: ({ className, ...props }: any) => (
    <th
      {...props}
      className={cn(
        "whitespace-nowrap px-3.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide",
        className,
      )}
    />
  ),
  td: ({ className, ...props }: any) => (
    <td
      {...props}
      className={cn("px-3.5 py-2.5 align-top text-nb-gray-200", className)}
    />
  ),
};

export function MarkdownText() {
  const restore = useRestorePlaceholders();

  return (
    <div className="assistant-markdown text-sm leading-relaxed text-nb-gray-100">
      <MarkdownTextPrimitive
        remarkPlugins={[remarkGfm]}
        /*
          The server already streams token by token, and the primitive's own
          reveal animation runs on top of that — two clocks over one string,
          which reads as the text hesitating and catching up in bursts. The real
          stream is smooth enough on its own.
        */
        smooth={false}
        components={{ ...components, CodeHeader, SyntaxHighlighter } as any}
        // Runs on the part's text before parsing — the right seam for turning
        // `{PEER_1}` back into the device's real name.
        preprocess={restore}
      />
    </div>
  );
}

export default MarkdownText;
