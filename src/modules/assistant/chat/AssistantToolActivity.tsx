"use client";

import { cn } from "@utils/helpers";
import { Check, ChevronRight, Info, Loader2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isOmittedOutput } from "@/modules/assistant/lib/contract";
import { CONTROL_CENTER_TOOLS } from "@/modules/assistant/lib/control-center";
import { describeToolCall } from "@/modules/assistant/lib/tools";
import { useTurnActive } from "@/modules/assistant/chat/AssistantTurnContext";
import { navigateToPage } from "@/modules/assistant/lib/page-redirect";

export interface ToolActivityProps {
  toolName: string;
  status?: { type: string };
  isError?: boolean;
  args?: unknown;
  result?: unknown;
}

function subjectOf(toolName: string, args: unknown): string | null {
  if (!args || typeof args !== "object") return null;

  if (toolName === "dashboard_page_redirect") {
    const target = navigateToPage({ ...args });
    return "href" in target ? target.href : null;
  }

  if (toolName === "netbird_api" || toolName === "docs_search") {
    const key = toolName === "netbird_api" ? "id" : "url";
    const value = (args as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  for (const value of Object.values(args as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export const asJson = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object" && Object.keys(value).length === 0) return null;
  return JSON.stringify(value, null, 2);
};

function formatResult(result: unknown): string | null {
  if (result === undefined || result === null || isOmittedOutput(result)) return null;
  const content = (result as { content?: unknown })?.content;
  if (typeof content === "string") result = content;
  const raw = typeof result === "string" ? result : JSON.stringify(result);
  const text = raw.trim();
  if (!text) return null;

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

const INVISIBLE_CONTROLS = /[\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;

const escapeInvisibleControls = (text: string): string =>
  text.replace(
    INVISIBLE_CONTROLS,
    (char) => `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
  );

const FALLBACK_LINE_HEIGHT = 18;

export function ToolPayload({
  title,
  children,
  showHidden = false,
}: Readonly<{
  title: string;
  children: string;
  showHidden?: boolean;
}>) {
  const boxRef = useRef<HTMLPreElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [hiddenLines, setHiddenLines] = useState(0);

  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const lineHeight =
      Number.parseFloat(getComputedStyle(box).lineHeight) || FALLBACK_LINE_HEIGHT;
    const below = box.scrollHeight - box.clientHeight - box.scrollTop;
    setScrollable(box.scrollHeight > box.clientHeight);
    setHiddenLines(Math.max(0, Math.round(below / lineHeight)));
  }, []);

  useLayoutEffect(() => {
    if (showHidden) measure();
  }, [showHidden, measure, children]);

  useEffect(() => {
    const box = boxRef.current;
    if (!showHidden || !box) return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [showHidden, measure]);

  return (
    <div className="py-2 pl-3">
      <div className="mb-1 pr-3 text-[11px] uppercase tracking-wide text-nb-gray-400">
        {title}
      </div>
      <pre
        ref={boxRef}
        onScroll={showHidden ? measure : undefined}
        tabIndex={scrollable ? 0 : undefined}
        className="nb-scrollbar max-h-64 overflow-auto whitespace-pre-wrap break-words pr-3 font-mono text-[12px] text-nb-gray-200"
      >
        {escapeInvisibleControls(children)}
      </pre>
      {hiddenLines > 0 && (
        <div className="mt-1.5 pr-3 text-[11px] text-nb-gray-300">
          Scroll to see {hiddenLines} more {hiddenLines === 1 ? "line" : "lines"}
        </div>
      )}
    </div>
  );
}

export function AssistantToolActivity({
  toolName,
  status,
  isError,
  args,
  result,
}: Readonly<ToolActivityProps>) {
  const [open, setOpen] = useState(false);

  const failed = isError === true || status?.type === "incomplete";
  // eve resolves its own framework tools without sending a result, so their
  // status stays "running" forever: the turn ending settles the row too.
  const turnActive = useTurnActive();
  const settled = failed || result !== undefined || !turnActive;
  const running = !settled && status?.type === "running";
  const done = !failed && result !== undefined;

  const request = asJson(args);
  const outcome = formatResult(result);
  const expandable = Boolean(request || outcome);
  const described = describeToolCall(toolName, args, running);
  // `described.subject` is undefined for "no opinion" (the first-string rule
  // applies) and null for "this row has no subject".
  let subject: string | null | undefined;
  if (CONTROL_CENTER_TOOLS[toolName]) subject = null;
  else if (described.subject === undefined) subject = subjectOf(toolName, args);
  else subject = described.subject;
  const line = [described.label, described.detail, subject && `'${subject}'`]
    .filter(Boolean)
    .join(" ");

  const chevron = <ChevronRight size={13} className={cn("transition-transform", open && "rotate-90")} />;
  // The spinner is 12 and `block`, not 13 like its neighbours: an odd size
  // or an inline baseline puts the rotation off-centre and the spin wobbles.
  let icon: ReactNode;
  if (running) icon = <Loader2 size={12} className="block animate-spin" />;
  else if (failed) icon = expandable ? chevron : <Info size={13} />;
  else icon = expandable && chevron;

  return (
    <div className="text-chat">
      <button
        type="button"
        onClick={() => expandable && setOpen((wasOpen) => !wasOpen)}
        aria-expanded={expandable ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 pb-1 text-left transition-colors",
          failed
            ? "text-red-400 hover:text-red-300"
            : "text-nb-gray-300 hover:text-nb-gray-100",
        )}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {icon}
        </span>

        <span
          className={cn(
            "min-w-0 truncate",
            running &&
              "animate-shimmer bg-gradient-to-r from-nb-gray-500 via-nb-gray-100 to-nb-gray-500 bg-[length:200%_100%] bg-clip-text text-transparent",
          )}
        >
          {line}
          {running ? "…" : ""}
        </span>

        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {!running && failed && <Info size={13} />}
          {done && <Check size={13} className="text-green-500" />}
        </span>
      </button>

      {open && (
        <div className="mb-5 ml-6 mt-0.5 overflow-hidden rounded-lg border border-nb-gray-900 bg-nb-gray-940">
          {request && <ToolPayload title="Request">{request}</ToolPayload>}
          {request && outcome && <div className="h-px bg-nb-gray-900" />}
          {outcome && <ToolPayload title="Result">{outcome}</ToolPayload>}
        </div>
      )}
    </div>
  );
}
