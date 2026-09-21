"use client";

import { ShieldQuestion } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  type AccessRequest,
  cancelAccessAuthorization,
  confirmPendingCommand,
  openAuthorizationWindow,
  subscribeToAccessRequest,
} from "@/modules/assistant/assistantAccessAuth";

/**
 * The prompt that authorizes the assistant to reach one peer.
 *
 * ## Why it takes the composer's place
 *
 * It is the same kind of thing as the approval gate beside it: the turn has
 * stopped and will not move until the user answers. So it renders where the
 * composer would be, in that same slot, rather than as a banner somewhere in
 * the panel — which is where it was first put, and it landed behind the
 * thread's absolutely-positioned composer where nobody could see it.
 *
 * ## Why a button and not an automatic window
 *
 * Browsers only allow `window.open` synchronously inside a user gesture, and
 * the assistant's tool dispatch arrives over an event stream several awaits
 * before it would open one — so a popup opened from the executor is blocked.
 * The click is therefore load-bearing rather than decorative, and it happens
 * to be exactly the signal the feature is after: a person, present, deciding
 * that the assistant may reach this machine.
 *
 * ## Two questions, one at a time
 *
 * The first command on a peer asks about ACCESS and shows no command at all:
 * the answer grants the assistant SSH to that machine for as long as the tab
 * is connected, which is true whatever runs next, so a command on that card
 * would only invite the grant to be weighed by how harmless one string looks.
 * The command is confirmed afterwards, on its own card, once that question is
 * settled and cannot be confused with it.
 *
 * Asking here rather than through the framework's own `approval` is still what
 * makes that order possible: `approval` parks a tool call before it runs, so it
 * could only ever ask about the command first and leave the sign-in as a
 * surprise afterwards. By this point the peer is resolved and it is known
 * whether access already exists.
 */
export function AssistantAccessPrompt() {
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => subscribeToAccessRequest(setRequest), []);

  // Escape declines, matching the approval gate's binding. No Enter: opening a
  // window is not something a reflex should be able to do.
  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape") return;
      event.preventDefault();
      cancelAccessAuthorization();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request]);

  if (!request) return null;

  const authorizing = request.step === "authorize";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={
        authorizing
          ? `Authorize the assistant to reach ${request.peerLabel}?`
          : `Run ${request.command} on ${request.peerLabel}?`
      }
      className="w-full rounded-2xl border border-nb-gray-700 bg-nb-gray-900 px-4 pb-3.5 pt-4"
    >
      <div className="flex items-start gap-2.5">
        <ShieldQuestion
          size={16}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 text-nb-gray-250"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-chat font-normal text-nb-gray-100">
            {authorizing
              ? `Authorize access to ${request.peerLabel}?`
              : `Run this on ${request.peerLabel}?`}
          </p>
          {/* Only on the confirmation, and verbatim and monospaced there,
              because on that card the command IS the thing being agreed to.
              The authorization card deliberately shows none: it is about
              reaching the machine at all. */}
          {!authorizing && (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-nb-gray-950 px-2.5 py-2 font-mono text-xs text-nb-gray-100">
              {request.command}
            </pre>
          )}
          {/* Neither line forecasts the next prompt, and the confirmation's
              used to: it said the user would be asked again for the next
              command, which the agent's clearance makes untrue — a command it
              judged to be pure inspection runs without appearing here at all.
              What the authorization line promises instead is the floor that
              holds in every configuration, cleared or not, evaluator or none:
              nothing that CHANGES the machine runs unasked. */}
          <p className="mt-2 text-xs text-nb-gray-400">
            {authorizing
              ? "Opens a sign-in window. The assistant gets SSH access to this peer only, until it disconnects, and asks you to confirm anything that changes it."
              : "The assistant already has SSH access to this peer in this tab."}
          </p>

          {blocked && (
            <p className="mt-2 text-xs text-red-400">
              The window was blocked. Allow pop-ups for this site, then try
              again.
            </p>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => cancelAccessAuthorization()}
              className="rounded-lg px-3 py-1.5 text-xs text-nb-gray-300 transition-colors hover:text-nb-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setBlocked(false);
                if (!authorizing) {
                  // Nothing to open: access is already granted and this click
                  // only confirms the command.
                  confirmPendingCommand();
                  return;
                }
                // Straight from the click — anything awaited first loses the
                // gesture and the window is blocked.
                if (!openAuthorizationWindow()) setBlocked(true);
              }}
              className="rounded-lg bg-netbird px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
            >
              {/* "Allow Once" rather than "Run": what the click grants is this
                  one command, and the label is the last thing read before it
                  is granted. "Run" describes the machine's next move; this
                  describes the permission being given, and its scope. */}
              {authorizing ? "Authorize" : "Allow Once"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
