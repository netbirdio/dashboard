"use client";

import React from "react";

/**
 * A turn that failed, said in the conversation rather than beside it.
 *
 * ## Why this exists
 *
 * The SDK has always computed an `error` — it records `step.failed` and
 * `turn.failed`, which the framework's own client store drops, precisely so a
 * mid-turn framework failure is not invisible. Nothing rendered it. So a turn
 * that died on a provider outage, an exhausted quota or a billing problem
 * looked identical to the assistant deciding it had nothing to say: the status
 * line cleared, no message appeared, and the reason sat in a server log the
 * user cannot read.
 *
 * ## Why it looks like a message
 *
 * Because that is what it is — the turn's outcome, in the place the answer
 * would have been. It takes the assistant bubble's geometry and spacing and
 * changes only the background, which is the whole signal: no icon, nothing to
 * dismiss, nothing that reads as a system dialog interrupting the thread. A
 * failure that arrives as chrome invites being closed and forgotten; one that
 * arrives as the reply stays in the transcript next to the message that caused
 * it.
 *
 * ## The text is the framework's own
 *
 * Verbatim. These come from the framework and the provider and are written for
 * a person — "Your credit balance is too low" is what tells the user this is
 * theirs to fix rather than a bug, and any friendlier rewrite strips exactly
 * that.
 */
export function AssistantErrorNotice({
  error,
}: Readonly<{ error: string | null }>) {
  if (!error) return null;

  return (
    // Mirrors AssistantMessage's rhythm so it sits in the flow rather than
    // after it; left-aligned and corner-notched like a reply.
    <div role="alert" className="mb-6 mt-1.5 flex">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-bl-sm bg-red-950/80 border border-red-900/70 px-3 py-2 text-sm text-red-200/90">
        {error}
      </div>
    </div>
  );
}
