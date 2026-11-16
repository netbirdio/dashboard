"use client";

import Button from "@components/Button";
import { cn } from "@utils/helpers";
import { MessageCircleQuestion, ShieldQuestion } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

function affirmativeOf(options: Option[]): Option | undefined {
  return options.find((o) => o.style === "primary") ?? options[0];
}

// Never the affirmative too: a lone option would otherwise render twice.
function negativeOf(options: Option[]): Option | undefined {
  const negative = options.find((o) => o.style === "danger") ?? options.at(-1);
  return negative === affirmativeOf(options) ? undefined : negative;
}

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
  onRespond: (answer: string) => void;
  onNewChat?: () => void;
}

export function AssistantApprovalCard({
  request,
  onRespond,
  onNewChat,
}: Readonly<ApprovalCardProps>) {
  // Latches on the first answer: a second one would post to a request
  // the framework has already resolved.
  const [answering, setAnswering] = useState<string | null>(null);

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

  // On the length limit, New chat takes the affirmative's place and Stop is the refusal.
  const newChat = request.kind === "session-limit" ? onNewChat : undefined;
  const affirmative = newChat ? undefined : affirmativeOf(request.options);
  const negative = newChat ? request.options[0] : negativeOf(request.options);

  const ordered = [
    ...(negative ? [negative] : []),
    ...request.options.filter((o) => o !== negative && o !== affirmative),
    ...(affirmative ? [affirmative] : []),
  ];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== "Enter" && event.key !== "Escape") return;
      if (event.key === "Enter" && newChat) {
        event.preventDefault();
        newChat();
        return;
      }
      const option = event.key === "Enter" ? affirmative : negative;
      if (!option) return;
      event.preventDefault();
      respond(option.id);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [affirmative, negative, respond, newChat]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={approvalTitle(request)}
      className="w-full rounded-2xl border border-nb-gray-700 bg-nb-gray-900 px-4 pb-3.5 pt-4"
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
          <p className="mt-1 text-xs text-nb-gray-400">
            {request.kind === "session-limit"
              ? "New chat starts fresh. Stop ends this answer and keeps this chat here to read."
              : "The assistant is waiting for you. Nothing else it has been asked will run until you answer."}
          </p>
        </div>
      </div>

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
              {labelFor(request, option, isAffirmative)}
            </Button>
          );
        })}
        {newChat && (
          <Button
            size="xs"
            variant="primary"
            onClick={newChat}
            className="!py-1.5 gap-2"
          >
            New chat
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
}: Readonly<{
  request: PendingInputRequest | null;
  onRespond: (answer: string) => void;
  onNewChat?: () => void;
}>) {
  if (!request) return null;
  return (
    <AssistantApprovalCard
      // Resets the answer latch for each new pause.
      key={request.requestId}
      request={request}
      onRespond={onRespond}
      onNewChat={onNewChat}
    />
  );
}
