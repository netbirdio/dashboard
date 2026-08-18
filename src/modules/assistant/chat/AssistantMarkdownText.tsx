// Raw HTML stays off (no rehype-raw): model output is untrusted.
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
import { useRedactor } from "@/modules/assistant/utils/redaction";

// Registered by hand rather than lowlight's `common` bundle, so only the
// grammars a NetBird answer contains get bundled; anything else stays plain.
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

// The aliases a model actually writes on a fence, mapped to the above.
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

const lowlight = createLowlight({ ...LANGUAGES, ...ALIASES });

// Block vs inline comes from the primitive, not the `language-*` class: a fence
// without a language has no such class, and sniffing painted a chip inside the block.
function Code({ className, ...props }: any) {
  const isBlock = useIsMarkdownCodeBlock();

  return (
    <code
      {...props}
      className={cn(
        "font-mono text-[0.95em] text-nb-gray-100",
        !isBlock &&
          "rounded border border-nb-gray-850 bg-nb-gray-920 px-1 py-0.5",
        className,
      )}
    />
  );
}

// lowlight hast → React: only nested spans with `hljs-*` classes (styled in
// globals.css) and text.
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

// Not a rehype plugin: the primitive only renders `CodeHeader` for blocks whose
// child is a plain string, so a plugin's span tree quietly lost every header.
function SyntaxHighlighter({
  language,
  code,
  components: { Pre, Code },
}: SyntaxHighlighterProps) {
  // No auto-detect: guessing paints a short snippet as the wrong grammar.
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

function CodeHeader({ language, code }: CodeHeaderProps) {
  // Silent: a toast for every snippet in a long answer is a lot of toast.
  const [, copyToClipboard, copied] = useCopyToClipboard(code, {
    silent: true,
  });

  return (
    /* `.assistant-code-header + pre` in globals.css strips the seam, so the
       `pre` needs no knowledge of whether a header was rendered. */
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

// Block spacing is set element by element because Tailwind's preflight zeroes
// the browser's default margins.
const components = {
  p: ({ className, ...props }: any) => (
    <p {...props} className={cn("my-3 first:mt-0 last:mb-0", className)} />
  ),
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
  // One heading scale: stepped sizes made deeper levels smaller than body text.
  h1: ({ className, children, ...props }: any) => (
    <h2 {...props} className={cn(headingClass, className)}>
      {children}
    </h2>
  ),
  h2: ({ className, children, ...props }: any) => (
    <h2 {...props} className={cn(headingClass, className)}>
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }: any) => (
    <h3 {...props} className={cn(headingClass, className)}>
      {children}
    </h3>
  ),
  h4: ({ className, children, ...props }: any) => (
    <h4 {...props} className={cn(headingClass, className)}>
      {children}
    </h4>
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
  // The external-link icon marks absolute http(s) targets only; relative links
  // stay inside the dashboard.
  a: ({ className, children, href, ...props }: any) => (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
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
  // When a header is rendered above, the sibling rule in globals.css joins the two.
  pre: ({ className, ...props }: any) => (
    <pre
      {...props}
      className={cn(
        "my-3 overflow-x-auto rounded-lg border border-nb-gray-850 bg-nb-gray-920 p-3 pb-2 text-chat",
        className,
      )}
    />
  ),
  table: ({ className, ...props }: any) => (
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

export function AssistantMarkdownText() {
  const { restore } = useRedactor();

  return (
    <div className="assistant-markdown text-sm leading-relaxed text-nb-gray-100">
      <MarkdownTextPrimitive
        remarkPlugins={[remarkGfm]}
        // Placeholders become real names before the parser sees the text, so a
        // token can't be split across markdown elements.
        preprocess={restore}
        // The server already streams tokens; the primitive's reveal animation
        // on top reads as the text hesitating in bursts.
        smooth={false}
        components={{ ...components, CodeHeader, SyntaxHighlighter } as any}
      />
    </div>
  );
}
