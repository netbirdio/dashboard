// One row of the activity trail, for both server-run and client-run tools.
"use client";

import {
  CONTROL_CENTER_TOOLS,
  describeControlCenterTool,
  toolLabel,
} from "@netbird/assistant-react";
import { useVaultRestore } from "@netbird/assistant-react";
import { cn } from "@utils/helpers";
import { AlertCircle, Check, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { navigateToPage } from "@/modules/assistant/openPageExecutor";

// Narrower than `ToolCallMessagePartProps` on purpose: grouped parts hand over
// a part state, not the full props object, and this is all both have to agree on.
export interface ToolActivityProps {
  toolName: string;
  status?: { type: string };
  isError?: boolean;
  args?: unknown;
  result?: unknown;
}

// The first string in the input, since every tool takes exactly one that
// matters; `dashboard_page_redirect` instead shows the pushed route.
function subjectOf(toolName: string, args: unknown): string | null {
  if (!args || typeof args !== "object") return null;

  if (toolName === "dashboard_page_redirect") {
    const target = navigateToPage({ ...args });
    return "href" in target ? target.href : null;
  }

  for (const value of Object.values(args as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

const asJson = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object" && Object.keys(value).length === 0) return null;
  return JSON.stringify(value, null, 2);
};

// A server tool's result is `{ ok, content, summary, … }` — the content is the
// readable part. A management call's result is the JSON payload as a string.
const restoreOr = (
  text: string | null,
  restore: (text: string) => string,
): string | null => (text === null ? null : restore(text));

function formatResult(result: unknown): string | null {
  if (result === undefined || result === null) return null;
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

export function AssistantToolActivity({
  toolName,
  status,
  isError,
  args,
  result,
}: Readonly<ToolActivityProps>) {
  const [open, setOpen] = useState(false);
  const restore = useVaultRestore();

  const running = status?.type === "running";
  const failed = isError === true || status?.type === "incomplete";

  // Args and results are the wire copy — tokens in, real names for the user.
  // Restore is plain text substitution, so it works on the JSON strings too.
  const request = restoreOr(asJson(args), restore);
  const outcome = restoreOr(formatResult(result), restore);
  const expandable = Boolean(request || outcome);
  // The canvas tools name their own move and subject — the generic first-string
  // rule surfaced raw enums ('new_empty') and half a connection.
  const activity = CONTROL_CENTER_TOOLS[toolName]
    ? describeControlCenterTool(toolName, args)
    : null;
  const subject = activity
    ? null
    : restoreOr(subjectOf(toolName, args), restore);

  return (
    <div className="text-chat">
      <button
        type="button"
        onClick={() => expandable && setOpen((wasOpen) => !wasOpen)}
        aria-expanded={expandable ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 py-1 text-left transition-colors",
          // A failed row stays red on hover: sliding to the neutral colour
          // read as the error resolving itself under the cursor.
          failed
            ? "text-red-400 hover:text-red-300"
            : "text-nb-gray-300 hover:text-nb-gray-100",
        )}
      >
        {/* Same 16px box as the working indicator, so both lines start text on one column. */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {expandable && (
            <ChevronRight
              size={13}
              className={cn("transition-transform", open && "rotate-90")}
            />
          )}
        </span>

        <span
          className={cn(
            "shrink-0",
            running &&
              "animate-shimmer bg-gradient-to-r from-nb-gray-500 via-nb-gray-100 to-nb-gray-500 bg-[length:200%_100%] bg-clip-text text-transparent",
          )}
        >
          {activity ? activity.label : toolLabel(toolName, running)}
          {running ? "…" : ""}
        </span>

        {activity?.detail && (
          <span className="min-w-0 truncate">{restore(activity.detail)}</span>
        )}

        {subject && <span className="min-w-0 truncate">{`'${subject}'`}</span>}

        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {running && <Loader2 size={14} className="animate-spin" />}
          {!running && failed && <AlertCircle size={13} />}
          {!running && !failed && (
            <Check size={13} className="text-green-500" />
          )}
        </span>
      </button>

      {open && (
        <div className="mb-5 ml-6 mt-0.5 overflow-hidden rounded-lg border border-nb-gray-900 bg-nb-gray-940">
          {request && (
            <div className="py-2 pl-3">
              <div className="mb-1 pr-3 text-[11px] uppercase tracking-wide text-nb-gray-400">
                Request
              </div>
              {/* The panel's padding sits inside the `pre`, so the scrollbar
                  track lands on the panel's right edge. */}
              <pre className="nb-scrollbar max-h-64 overflow-auto whitespace-pre-wrap break-words pr-3 font-mono text-[12px] text-nb-gray-200">
                {request}
              </pre>
            </div>
          )}
          {request && outcome && <div className="h-px bg-nb-gray-900" />}
          {outcome && (
            <div className="py-2 pl-3">
              <div className="mb-1 pr-3 text-[11px] uppercase tracking-wide text-nb-gray-400">
                Result
              </div>
              {/* Capped: a `list_peers` payload can be longer than the answer it supports. */}
              <pre className="nb-scrollbar max-h-64 overflow-auto whitespace-pre-wrap break-words pr-3 font-mono text-[12px] text-nb-gray-200">
                {outcome}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
