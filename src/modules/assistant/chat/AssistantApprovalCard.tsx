// The gate for a framework pause: a tool waiting on approval, or a runtime
// limit waiting on a decision. It takes the composer's place at the foot of
// the panel rather than floating over the thread: the framework answers
// nothing — not this prompt, not any message sent after it — until one of
// these options comes back, so the box you would have typed into is exactly
// the thing that should not be there. The conversation stays readable behind
// it, which is usually what the decision is about.
"use client";

import Button from "@components/Button";
import {
  type PendingInputRequest,
  toolLabel,
  useVaultRestore,
} from "@netbird/assistant-react";
import { cn } from "@utils/helpers";
import { ShieldQuestion } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * What the card asks, in the words the rest of the thread uses.
 *
 * The framework's own prompt is written for a generic client — "Approve tool
 * call: peer_ssh_bash" — and the tool's wire name is not what this dashboard
 * calls it anywhere else. The manifest label is, so a tool approval gets that and
 * every other pause gets the framework's prompt, which is already prose.
 */
function approvalTitle(request: PendingInputRequest): string {
  if (request.kind !== "tool-approval" || !request.toolName)
    return request.prompt;
  return `${toolLabel(request.toolName, false)}?`;
}

type Option = PendingInputRequest["options"][number];

/**
 * Which option each key answers.
 *
 * Chosen from the framework's own `style` hint first, since that is the field
 * it sets deliberately, and from the option's position only as a fallback —
 * never from the label, which is copy and changes. A pause that offers
 * something other than a yes/no pair still renders every option as a button;
 * only the keyboard shortcuts need a pair to bind to.
 */
function affirmativeOf(options: Option[]): Option | undefined {
  return options.find((o) => o.style === "primary") ?? options[0];
}

function negativeOf(options: Option[]): Option | undefined {
  const negative = options.find((o) => o.style === "danger");
  if (negative) return negative;
  const last = options[options.length - 1];
  return last === affirmativeOf(options) ? undefined : last;
}

/**
 * The copy for a tool approval, which is a narrower question than the
 * framework's generic one: this grants a single call, not a standing
 * permission.
 */
function labelFor(
  request: PendingInputRequest,
  option: Option,
  affirmative: boolean,
): string {
  if (request.kind !== "tool-approval") return option.label;
  return affirmative ? "Allow Once" : "Deny";
}

export interface ApprovalCardProps {
  request: PendingInputRequest;
  onRespond: (optionId: string) => void;
}

export function AssistantApprovalCard({
  request,
  onRespond,
}: Readonly<ApprovalCardProps>) {
  // The answer is a round trip, and the session is parked until it lands. A
  // second click would post a second response to a request the framework has
  // already resolved, so the buttons latch on the first one.
  const [answering, setAnswering] = useState<string | null>(null);
  const restore = useVaultRestore();

  const respond = useCallback(
    (optionId: string) => {
      setAnswering((current) => {
        if (current !== null) return current;
        onRespond(optionId);
        return optionId;
      });
    },
    [onRespond],
  );

  const affirmative = affirmativeOf(request.options);
  const negative = negativeOf(request.options);

  /*
    Deny first, allow last, whatever order the framework listed them in. The
    rightmost button is the one a pointer travels to by default and the one
    Enter is bound to, so it has to be the same choice either way — and the
    destructive half of a yes/no pair should never be what a reflex lands on.
  */
  const ordered = [
    ...(negative ? [negative] : []),
    ...request.options.filter((o) => o !== negative && o !== affirmative),
    ...(affirmative ? [affirmative] : []),
  ];

  // Enter and Escape, bound while the gate is up. Captured on the window
  // because the overlay covers the composer: there is nothing else on screen
  // these keys could sensibly mean.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const option =
        event.key === "Enter"
          ? affirmative
          : event.key === "Escape"
          ? negative
          : undefined;
      if (!option) return;
      event.preventDefault();
      respond(option.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [affirmative, negative, respond]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={approvalTitle(request)}
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
            {restore(approvalTitle(request))}
          </p>
          <p className="mt-1 text-xs text-nb-gray-400">
            The assistant is waiting for you. Nothing else it has been asked
            will run until you answer.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {ordered.map((option) => {
          const isAffirmative = option === affirmative;
          const isNegative = option === negative;
          return (
            /* The dashboard's own Button, so these two read as the same kind of
               control as every other pair of actions in the product, and pick
               up its focus ring and disabled treatment for free. Refusing is
               `danger-outline` rather than another neutral box: the two halves
               of the pair have to be told apart at a glance, and outlined-red
               against filled-orange is the contrast the rest of the dashboard
               already uses for an action and its refusal. */
            <Button
              key={option.id}
              size="xs"
              variant={isAffirmative ? "primary" : "secondaryLighter"}
              disabled={answering !== null}
              onClick={() => respond(option.id)}
              title={option.description}
              className={cn(
                "!py-1.5 gap-2",
                answering !== null && answering !== option.id && "opacity-50",
              )}
            >
              {restore(labelFor(request, option, isAffirmative))}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The pause in the composer's slot, or nothing.
 *
 * A thin wrapper so the thread does not have to know the card's null case or
 * its reset key, and so "what replaces the composer" stays one decision in one
 * place.
 */
export function AssistantApprovalGate({
  request,
  onRespond,
}: Readonly<{
  request: PendingInputRequest | null;
  onRespond: (optionId: string) => void;
}>) {
  if (!request) return null;
  return (
    <AssistantApprovalCard
      // A new pause is a new card, so a latched button does not carry over
      // from the one before it.
      key={request.requestId}
      request={request}
      onRespond={onRespond}
    />
  );
}
