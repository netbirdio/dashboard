/**
 * One row of the activity trail: a tool call, in the order it happened.
 *
 * Covers both halves of the tool set — server-run tools (documentation lookups,
 * arriving as `tool_activity` events) and client-run management calls we execute
 * ourselves. The row says *that* the assistant read the user's peers or searched
 * the docs; the detail is a click away rather than in their face.
 *
 * Shaped after assistant-ui's own tool-call element: chevron, label, the call's
 * subject in ticks, then how it went. The leading chevron sits in
 * the same 16px box the working indicator uses for its mark, so a row and the
 * "Thinking" line under it start their text on the same column.
 */
"use client";

import { cn } from "@utils/helpers";
import { AlertCircle, Check, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRestorePlaceholders } from "../privacy/RedactorContext";
import { OPEN_PAGE_TOOL, pageHref, toolLabel } from "../tools/clientTools";
import {
  controlCenterActivity,
  isControlCenterTool,
} from "../tools/controlCenterTools";

/**
 * The fields a row needs. Narrower than `ToolCallMessagePartProps` on purpose:
 * grouped parts hand over a part state rather than the full props object, and
 * this is all either of them has to agree on.
 */
export interface ToolActivityProps {
  toolName: string;
  status?: { type: string };
  isError?: boolean;
  args?: unknown;
  result?: unknown;
}

/**
 * What the call was *about*, for the chip: the first string in the input. Every
 * tool that takes one takes exactly one that matters — a query, a URL, an id —
 * so picking the first beats naming each tool's field here.
 *
 * `open_page` is the exception: its input names a page in the model's
 * vocabulary ("users"), and the useful thing to show is where that actually
 * went — the route the dashboard pushed. Its id is restored BEFORE the href is
 * built: `pageHref` percent-encodes it, and `%7BPEER_3%7D` is past restoring.
 */
function subjectOf(
  toolName: string,
  args: unknown,
  restore: (text: string) => string,
): string | null {
  if (!args || typeof args !== "object") return null;

  if (toolName === OPEN_PAGE_TOOL) {
    const input = Object.fromEntries(
      Object.entries(args as Record<string, unknown>).map(([key, value]) => [
        key,
        typeof value === "string" ? restore(value) : value,
      ]),
    );
    return pageHref(input);
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

/**
 * Tool results arrive as strings — a one-line summary from a server tool, the
 * redacted payload from a management call. Re-indent the payload so a fetched
 * peer list reads as a peer list; leave a summary alone.
 */
function formatResult(result: unknown): string | null {
  if (result === undefined || result === null) return null;
  const text = String(result).trim();
  if (!text) return null;

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function ToolActivity({
  toolName,
  status,
  isError,
  args,
  result,
}: ToolActivityProps) {
  const restore = useRestorePlaceholders();
  const [open, setOpen] = useState(false);

  const running = status?.type === "running";
  const failed = isError === true || status?.type === "incomplete";

  const request = asJson(args);
  const outcome = formatResult(result);
  // Nothing to reveal on a no-argument call that hasn't returned yet.
  const expandable = Boolean(request || outcome);
  /*
    The canvas tools name their own move and their own subject — the generic
    first-string rule surfaced raw enums ('new_empty') and half a connection.
    Everything else keeps that rule, quoted here.
  */
  const activity = isControlCenterTool(toolName)
    ? controlCenterActivity(toolName, args, restore)
    : null;
  const subject = activity ? null : subjectOf(toolName, args, restore);

  return (
    <div className="text-chat">
      <button
        type="button"
        onClick={() => expandable && setOpen((wasOpen) => !wasOpen)}
        aria-expanded={expandable ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 py-1 text-left transition-colors",
          // A failed row stays red on hover — brighter, not a different
          // colour. Sliding to the neutral hover colour read as the error
          // resolving itself under the cursor.
          failed
            ? "text-red-400 hover:text-red-300"
            : "text-nb-gray-300 hover:text-nb-gray-100",
        )}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {expandable && (
            <ChevronRight
              size={13}
              className={cn("transition-transform", open && "rotate-90")}
            />
          )}
        </span>

        {/* The same sweep the working indicator uses — a step in progress and
            the line under it are one state, so they shouldn't animate
            differently. */}
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

        {/* Ticked rather than chipped, and in the row's own colour and size:
            it's part of the same sentence as the label, not an annotation on
            it. A filled badge gave the argument more weight than the step. */}
        {activity?.detail && (
          <span className="min-w-0 truncate">{activity.detail}</span>
        )}

        {subject && (
          <span className="min-w-0 truncate">{`'${restore(subject)}'`}</span>
        )}

        {/* Last, and directly after the subject rather than pinned to the far
            edge: the row reads as one sentence — what was done, to what, and
            how it went. */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {running ? (
            <Loader2 size={14} className="animate-spin" />
          ) : failed ? (
            <AlertCircle size={13} />
          ) : (
            <Check size={13} className="text-green-500" />
          )}
        </span>
      </button>

      {open && (
        // Indented past the chevron so it reads as belonging to the row, and
        // recessed *below* the panel rather than raised above it: this is raw
        // payload, the least important thing on screen. No frame either — a
        // bordered box made the row look like the header of a card it isn't.
        <div className="mb-5 ml-6 mt-0.5 overflow-hidden rounded-lg border border-nb-gray-900 bg-nb-gray-940">
          {request && (
            <div className="py-2 pl-3">
              <div className="mb-1 pr-3 text-[11px] uppercase tracking-wide text-nb-gray-400">
                Request
              </div>
              {/* The scroll container is the `pre` itself with the panel's own
                  padding *inside* it, so the track lands on the panel's right
                  edge instead of floating a gutter's width in from it. */}
              <pre className="nb-scrollbar max-h-64 overflow-auto whitespace-pre-wrap break-words pr-3 font-mono text-[12px] text-nb-gray-200">
                {restore(request)}
              </pre>
            </div>
          )}
          {request && outcome && <div className="h-px bg-nb-gray-900" />}
          {outcome && (
            <div className="py-2 pl-3">
              <div className="mb-1 pr-3 text-[11px] uppercase tracking-wide text-nb-gray-400">
                Result
              </div>
              {/* Capped: a `list_peers` payload is longer than the answer it
                  supports, and the trail is a footnote, not the content. */}
              <pre className="nb-scrollbar max-h-64 overflow-auto whitespace-pre-wrap break-words pr-3 font-mono text-[12px] text-nb-gray-200">
                {restore(outcome)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolActivity;
