// One row of the activity trail, for both server-run and client-run tools.
"use client";

import {
  CONTROL_CENTER_TOOLS,
  describeToolCall,
  useVaultRestore,
} from "@netbird/assistant-react";
import { cn } from "@utils/helpers";
import { Check, ChevronRight, Info, Loader2 } from "lucide-react";
import { useTurnActive } from "@/modules/assistant/chat/AssistantTurnContext";
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

  /*
    Named, not found. A peer command's subject is the machine, and the
    first-string rule only happened to return it while `peer` was the first
    field the model wrote — `summary` is a string too, and a call that emitted
    it first would have put the row's own label in its subject slot.
  */
  if (toolName === "ssh_exec") {
    const peer = (args as { peer?: unknown }).peer;
    return typeof peer === "string" && peer.trim() ? peer.trim() : null;
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

  const failed = isError === true || status?.type === "incomplete";
  /*
    A result in hand outranks the status. The status is the host's word for
    what the runtime last said, and a call that failed used to keep the
    spinner: the error was already here, and the row was the last thing still
    claiming to be waiting for it.
  */
  /*
    A row cannot still be running once the turn that owns it is over.

    eve resolves its own framework tools — `ask_question` among them — without
    sending back the tool result a dispatched tool returns, so `result` never
    arrives and the status stays "running" forever: the ask sat there spinning
    while the steps after it ticked off below. The turn ending is the honest
    end of anything it started.
  */
  const turnActive = useTurnActive();
  const settled = failed || result !== undefined || !turnActive;
  const running = !settled && status?.type === "running";

  // Args and results are the wire copy — tokens in, real names for the user.
  // Restore is plain text substitution, so it works on the JSON strings too.
  const request = restoreOr(asJson(args), restore);
  const outcome = restoreOr(formatResult(result), restore);
  const expandable = Boolean(request || outcome);
  /*
    How the row reads. The canvas tools name their own move, a peer command may
    carry the agent's own summary of what it does, and everything else takes
    the manifest's fixed label.
  */
  const described = describeToolCall(toolName, args, running);
  /*
    The canvas tools also name their own SUBJECT, so the generic first-string
    rule is skipped for them — it surfaced raw enums ('new_empty') and half a
    connection. Every other tool still shows it, a summary or not: on a peer
    command that subject is the peer, which is the one thing a row about a
    remote machine cannot leave out.

    `described.subject` is the third case: a tool the SDK names better than the
    rule can. It distinguishes "no opinion" (undefined, rule applies) from "this
    row has no subject" (null), which is what stops a label that already spells
    out its skill from being followed by the slug it came from.
  */
  const subject = CONTROL_CENTER_TOOLS[toolName]
    ? null
    : described.subject !== undefined
      ? described.subject
      : subjectOf(toolName, args);
  /*
    One string, not three spans.

    The label, the preposition and the quoted subject are one sentence about
    one call — "List user accounts on 'MacBook-Pro-von-Eduard.local'" — and
    splitting them across flex children put the row's `gap-2` inside it, so it
    read as three separate labels with 8px gutters rather than as a phrase.
    Joined here, the gap is left to do its real job of spacing the icons.

    Restored once, at the end: restore is plain text substitution, so running
    it over the finished line is the same as running it over each part, and
    the summary is model text that can carry a token too.
  */
  const line = restore(
    [described.label, described.detail, subject && `'${subject}'`]
      .filter(Boolean)
      .join(" "),
  );

  return (
    <div className="text-chat">
      <button
        type="button"
        onClick={() => expandable && setOpen((wasOpen) => !wasOpen)}
        aria-expanded={expandable ? open : undefined}
        className={cn(
          "flex w-full items-center gap-2 pb-1 text-left transition-colors",
          // A failed row stays red on hover: sliding to the neutral colour
          // read as the error resolving itself under the cursor.
          failed
            ? "text-red-400 hover:text-red-300"
            : "text-nb-gray-300 hover:text-nb-gray-100",
        )}
      >
        {/* Same 16px box as the working indicator, so both lines start text on
            one column — and while the call runs it carries the spinner, which
            is what that column is for. Empty here and spinning on the far side
            of the label left the row visibly headless against the working line
            right below it, with the progress orphaned past the text it belongs
            to. The chevron takes the box back once there is a result to open,
            which is also the moment the spinner has nothing left to say.
            A spinner rather than the working line's pulsing logo mark: a tool
            row and that line are different claims — this call is running,
            versus the assistant is thinking — and they stack, so giving both
            the same mark would show the NetBird logo twice saying two things. */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {running ? (
            /* 12, not the 13 its neighbours use, and `block`.

               Lucide draws a 24-unit viewBox at the pixel size given, so 13
               scales by 13/24 and puts the circle's centre on a half-pixel:
               the stroke then rasterises slightly differently on each frame
               and the spin visibly wobbles. 12 is an exact half, so the centre
               and the stroke land on whole pixels and the rotation is steady.
               The constraint only applies to the icon that MOVES — the chevron
               and info marks beside it stay at 13, where a half-pixel is
               static and invisible, and the 16px box keeps the column aligned
               either way. `block` drops the inline baseline gap, which would
               otherwise put the rotation origin below the glyph's centre. */
            <Loader2 size={12} className="block animate-spin" />
          ) : failed ? (
            /* An expandable failed row still needs its chevron; one with
               nothing to open says so with the icon instead. */
            expandable ? (
              <ChevronRight
                size={13}
                className={cn("transition-transform", open && "rotate-90")}
              />
            ) : (
              <Info size={13} />
            )
          ) : (
            expandable && (
              <ChevronRight
                size={13}
                className={cn("transition-transform", open && "rotate-90")}
              />
            )
          )}
        </span>

        {/* `min-w-0 truncate` rather than `shrink-0`: the line now carries the
            subject, so a long peer name has to ellipse at the end of the
            phrase instead of pushing the outcome mark off the row. */}
        <span
          className={cn(
            "min-w-0 truncate",
            running &&
              "animate-shimmer bg-gradient-to-r from-nb-gray-500 via-nb-gray-100 to-nb-gray-500 bg-[length:200%_100%] bg-clip-text text-transparent",
          )}
        >
          {line}
          {/* At the end of the phrase, not after the label: "Reading the docs…
              'dns'" put the trailing-off in the middle of the sentence. */}
          {running ? "…" : ""}
        </span>

        {/* The outcome, once there is one. Kept at width while the call runs so
            the label does not shift sideways when the tick arrives. */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {/* A finished call always ends with a mark here: a tick when it
              worked, an info circle when it did not. The row is a record of
              what happened, and "nothing" is not one of the outcomes. */}
          {!running && failed && <Info size={13} />}
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
