"use client";

import { ShieldQuestion } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  type AccessRequest,
  cancelAccessAuthorization,
  confirmWithoutAuthorization,
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
 * ## One prompt, both questions
 *
 * It shows the command every time and asks for a sign-in only the first time
 * for a given peer. That ordering is the point: eve's own `approval` parks a
 * tool call BEFORE it runs, so it could only ever ask about the command first
 * and leave the sign-in as a surprise afterwards. Asking here — once the peer
 * is resolved and it is known whether access already exists — puts both in
 * front of the user at the same moment.
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

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`Run ${request.command} on ${request.peerLabel}?`}
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
            Run this on {request.peerLabel}?
          </p>
          {/* The command verbatim, and monospaced, because this is the thing
              being agreed to — not a summary of it. */}
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-nb-gray-950 px-2.5 py-2 font-mono text-xs text-nb-gray-100">
            {request.command}
          </pre>
          <p className="mt-2 text-xs text-nb-gray-400">
            {request.needsAuthorization
              ? "Opens a sign-in window first. The assistant gets SSH access to this peer only, until it disconnects."
              : "This peer is already authorized for this tab."}
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
                if (!request.needsAuthorization) {
                  // Nothing to open: the peer is authorized already and this
                  // click is only confirming the command.
                  confirmWithoutAuthorization();
                  return;
                }
                // Straight from the click — anything awaited first loses the
                // gesture and the window is blocked.
                if (!openAuthorizationWindow()) setBlocked(true);
              }}
              className="rounded-lg bg-netbird px-3 py-1.5 text-xs font-medium text-white transition-colors hover:brightness-110"
            >
              {request.needsAuthorization ? "Authorize Once" : "Allow Once"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
