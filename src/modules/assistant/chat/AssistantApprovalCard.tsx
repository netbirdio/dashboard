"use client";

import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { MessageCircleQuestion, ShieldQuestion } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { asJson, ToolPayload } from "@/modules/assistant/chat/AssistantToolActivity";
import { useArmingDelay } from "@/modules/assistant/chat/useArmingDelay";
import { acceptsFreeText, type PendingInputRequest } from "@/modules/assistant/hooks/useBrowserToolLoop";
import { toolLabel } from "@/modules/assistant/lib/tools";

function approvalTitle(request: PendingInputRequest): string {
  if (request.kind !== "tool-approval" || !request.toolName)
    return request.prompt;
  return `${toolLabel(request.toolName, false)}?`;
}

export const isOpenQuestion = (request: PendingInputRequest): boolean =>
  acceptsFreeText(request) && request.options.length === 0;

export function AssistantOpenQuestionCard({
  request,
}: Readonly<{ request: PendingInputRequest }>) {
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-2xl border border-nb-gray-700 bg-nb-gray-900 px-4 py-3.5">
      <MessageCircleQuestion
        size={16}
        strokeWidth={1.5}
        className="mt-0.5 shrink-0 text-nb-gray-250"
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-chat font-normal text-nb-gray-100">
        {approvalTitle(request)}
      </p>
    </div>
  );
}

type Option = PendingInputRequest["options"][number];

const APPROVE_ID = "approve";
const CANCEL_ID = "cancel";

const hasId = (option: Option, id: string): boolean => option.id.toLowerCase() === id;

function approvalPairOf(
  options: Option[],
): { approve: Option; cancel: Option } | null {
  if (options.length !== 2) return null;
  const approve = options.find((o) => hasId(o, APPROVE_ID));
  const cancel = options.find((o) => hasId(o, CANCEL_ID));
  return approve && cancel ? { approve, cancel } : null;
}

function affirmativeOf(options: Option[]): Option | undefined {
  const candidates = options.filter((o) => o.id !== CANCEL_ID);
  return (
    candidates.find((o) => o.id === APPROVE_ID) ??
    candidates.find((o) => o.style === "primary") ??
    candidates[0]
  );
}

// Never the affirmative too: a lone option would otherwise render twice.
function negativeOf(options: Option[]): Option | undefined {
  const negative =
    options.find((o) => o.id === CANCEL_ID) ??
    options.find((o) => o.style === "danger") ??
    options.at(-1);
  return negative === affirmativeOf(options) ? undefined : negative;
}

export interface ApprovalCardProps {
  request: PendingInputRequest;
  onRespond: (answer: string) => void;
  onNewChat?: () => void;
  onStop?: () => void;
  queued?: number;
}

const isTyping = (element: Element | null): boolean =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement);

export function AssistantApprovalCard({
  request,
  onRespond,
  onNewChat,
  onStop,
  queued = 1,
}: Readonly<ApprovalCardProps>) {
  // Latches on the first answer: a second one would post to a request
  // the framework has already resolved.
  const [answering, setAnswering] = useState<string | null>(null);

  const answeredRef = useRef(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const isArmed = useArmingDelay();
  const canAct = useCallback(
    () => isArmed() && !cardRef.current?.closest("[inert]"),
    [isArmed],
  );

  const respond = useCallback(
    (optionId: string) => {
      if (!canAct() || answeredRef.current) return;
      answeredRef.current = true;
      setAnswering(optionId);
      onRespond(optionId);
    },
    [onRespond, canAct],
  );

  // On the length limit, New chat takes the affirmative's place and Stop is the refusal.
  const newChat = request.kind === "session-limit" ? onNewChat : undefined;
  const isToolApproval = request.kind === "tool-approval";
  const approvalPair = isToolApproval ? approvalPairOf(request.options) : null;

  let affirmative: Option | undefined;
  let negative: Option | undefined;
  if (newChat) negative = request.options[0];
  else if (approvalPair) {
    affirmative = approvalPair.approve;
    negative = approvalPair.cancel;
  } else if (!isToolApproval) {
    affirmative = affirmativeOf(request.options);
    negative = negativeOf(request.options);
  }

  const labelOf = (option: Option): string => {
    if (!approvalPair) return option.label;
    return option === affirmative ? "Allow Once" : "Deny";
  };

  const ordered = [
    ...(negative ? [negative] : []),
    ...request.options.filter((o) => o !== negative && o !== affirmative),
    ...(affirmative ? [affirmative] : []),
  ];

  const stop = ordered.length === 0 && !newChat ? onStop : undefined;
  const payload = isToolApproval ? asJson(request.input) : null;

  const explanationId = useId();
  const payloadId = useId();
  const queueId = useId();
  const describedBy = [
    queued > 1 && queueId,
    explanationId,
    payload && payloadId,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (isTyping(document.activeElement)) return;
    cardRef.current?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      if (event.target !== event.currentTarget) return;
      if (newChat) {
        event.preventDefault();
        if (canAct()) newChat();
        return;
      }
      if (!affirmative) return;
      event.preventDefault();
      respond(affirmative.id);
      return;
    }
    if (!negative) return;
    event.preventDefault();
    respond(negative.id);
  };

  return (
    <div
      ref={cardRef}
      role="alertdialog"
      aria-label={approvalTitle(request)}
      aria-describedby={describedBy}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="w-full rounded-2xl border border-nb-gray-700 bg-nb-gray-900 px-4 pb-3.5 pt-4 outline-none"
    >
      <div className="flex items-start gap-2.5">
        {request.kind === "question" ? (
          <MessageCircleQuestion
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-nb-gray-250"
            aria-hidden
          />
        ) : (
          <ShieldQuestion
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-nb-gray-250"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-chat font-normal text-nb-gray-100">
            {approvalTitle(request)}
          </p>
          <p id={explanationId} className="mt-1 text-xs text-nb-gray-400">
            {request.kind === "session-limit"
              ? "New chat starts fresh. Stop ends this answer and keeps this chat here to read."
              : "The assistant is waiting for you. Nothing else it has been asked will run until you answer."}
          </p>
        </div>
        {queued > 1 && (
          <span
            id={queueId}
            className="shrink-0 text-xs tabular-nums text-nb-gray-400"
          >
            1 of {queued}
          </span>
        )}
      </div>

      {payload && (
        <div
          id={payloadId}
          className="mt-3 overflow-hidden rounded-lg border border-nb-gray-800 bg-nb-gray-940"
        >
          <ToolPayload title="Request" showHidden>
            {payload}
          </ToolPayload>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {ordered.map((option) => {
          const isAffirmative = option === affirmative;
          return (
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
              {labelOf(option)}
            </Button>
          );
        })}
        {newChat && (
          <Button
            size="xs"
            variant="primary"
            onClick={() => canAct() && newChat()}
            className="!py-1.5 gap-2"
          >
            New chat
          </Button>
        )}
        {stop && (
          <Button
            size="xs"
            variant="secondaryLighter"
            onClick={() => canAct() && stop()}
            className="!py-1.5 gap-2"
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}

export function AssistantApprovalGate({
  request,
  onRespond,
  onNewChat,
  onStop,
  queued,
}: Readonly<{
  request: PendingInputRequest | null;
  onRespond: (answer: string) => void;
  onNewChat?: () => void;
  onStop?: () => void;
  queued?: number;
}>) {
  if (!request) return null;
  return (
    <AssistantApprovalCard
      // Resets the answer latch and the arming delay for each new pause.
      key={request.requestId}
      request={request}
      onRespond={onRespond}
      onNewChat={onNewChat}
      onStop={onStop}
      queued={queued}
    />
  );
}
