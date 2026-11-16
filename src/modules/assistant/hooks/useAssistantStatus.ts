"use client";

import type { EveMessage } from "eve/react";
import { useMemo } from "react";
import type { ChatStatus } from "../lib/chat-session";
import { rendersTrailRow } from "../lib/contract";
import { isRunningToolPart } from "../lib/convert";
import { toolLabel } from "../lib/tools";

const STATUS_TEXT = {
  thinking: "Thinking",
  working: "Working",
  preparingQuestion: "Prepare a question",
} as const;

const STATUS_MAX_CHARS = 52;
const REASONING_TAIL_CHARS = 4_000;
const CLAUSE_MAX_CHARS = STATUS_MAX_CHARS * 4;

const STATUS_FILLER = [
  /^(ok(ay)?|so|now|alright|right|hmm+|well|actually|but|and|also)\b[\s,:—-]*/i,
  /^(let me|let's|i'll|i will|i need to|i should|i want to|i have to|i must|i can|we need to|we should)\s+/i,
  /^(i'?m|i am|we'?re|we are)\s+/i,
  /^(first|next|then|finally|however|therefore|basically|essentially)\b[\s,:—-]*/i,
  /^(the user (is )?(asking|wants|said|says|means|wrote)( for| to| that)?)\s*/i,
  /^(i think|it (looks|seems) like|apparently|presumably)\s+/i,
];

export function thinkingStatus(reasoning: string): string | null {
  const clauses = reasoning
    .slice(-REASONING_TAIL_CHARS)
    .split(/[.!?\n]+/)
    .map((c) => c.trim());
  let clause = (clauses.findLast(Boolean) ?? "").slice(0, CLAUSE_MAX_CHARS);

  for (let prev = ""; prev !== clause; ) {
    prev = clause;
    for (const pattern of STATUS_FILLER) clause = clause.replace(pattern, "");
  }
  clause = clause.trim();
  if (clause.length < 12) return null;

  if (clause.length > STATUS_MAX_CHARS) {
    const cut = clause.slice(0, STATUS_MAX_CHARS);
    const lastSpace = cut.lastIndexOf(" ");
    clause =
      (lastSpace > STATUS_MAX_CHARS / 2 ? cut.slice(0, lastSpace) : cut) + "…";
  }
  clause = clause.replace(/[,;:\s]+(…)?$/, "$1");
  return clause.charAt(0).toUpperCase() + clause.slice(1);
}

interface StatusLineInput {
  messages: readonly EveMessage[];
  status: ChatStatus;
  toolLoopBusy: boolean;
  questionShown: boolean;
}

function deriveStatusLine({
  messages,
  status,
  toolLoopBusy,
  questionShown,
}: StatusLineInput): string | null {
  const running =
    status === "submitted" || status === "streaming" || toolLoopBusy;
  if (!running) return null;

  const last = messages.at(-1);
  if (status === "submitted" || last?.role !== "assistant") {
    return STATUS_TEXT.thinking;
  }

  for (let i = last.parts.length - 1; i >= 0; i--) {
    const part = last.parts[i];
    if (!part) continue;
    if (part.type === "text" && part.text.trim()) return null;
    if (part.type === "dynamic-tool") {
      const name = part.toolName;
      if (isRunningToolPart(part)) {
        if (name === "ask_question" && !questionShown) return STATUS_TEXT.preparingQuestion;
        if (rendersTrailRow(name)) return null;
        return toolLabel(name, true);
      }
      return STATUS_TEXT.working;
    }
    if (part.type === "reasoning" && part.text) {
      // Reasoning is signed by the provider, so its `[PEER_1]` tokens cannot be restored:
      // a line that still holds one is not shown.
      const line = thinkingStatus(part.text);
      return line && !/\[[A-Z][A-Z_]*_[a-z2-7]{6,}\]/.test(line) ? line : STATUS_TEXT.thinking;
    }
  }
  return STATUS_TEXT.thinking;
}

export function useAssistantStatus(input: StatusLineInput): string | null {
  const { messages, status, toolLoopBusy, questionShown } = input;
  return useMemo(
    () => deriveStatusLine({ messages, status, toolLoopBusy, questionShown }),
    [messages, status, toolLoopBusy, questionShown],
  );
}
