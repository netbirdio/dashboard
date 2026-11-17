import type { EveDynamicToolPart, EveMessage } from "eve/react";
import { escapeRegExp } from "lodash";

type QuestionReply = { question: string; answer: string };

export type SentAnswers = ReadonlyMap<string, { optionId?: string; text?: string }>;

// A browser tool also parks on a question, so only `ask_question` counts as a reply.
const isAsk = (part: { toolName?: string }) => part.toolName === "ask_question";

function answeredQuestion(part: EveDynamicToolPart, sent: SentAnswers): QuestionReply | undefined {
  if (!isAsk(part)) return;
  const request = part.toolMetadata?.eve?.inputRequest;
  const response = part.toolMetadata?.eve?.inputResponse ??
    (request && { requestId: request.requestId, ...sent.get(request.requestId) });
  if (request?.kind === "question" && response?.requestId === request.requestId) {
    const answer = response.text ?? request.options?.find(
      (option) => option.id === response.optionId,
    )?.label;
    if (answer?.trim()) return { question: request.prompt, answer };
  }
}

type Part = EveMessage["parts"][number];

function withoutRestatement(parts: Part[], prompt: string): Part[] {
  const last = parts.at(-1);
  const words = prompt.split(/\s+/).filter(Boolean);
  if (last?.type !== "text" || words.length === 0) return parts;
  // Whitespace is matched loosely, and the text before the question keeps its own formatting.
  const restated = new RegExp(`(?:^|\\s)${words.map(escapeRegExp).join("\\s+")}\\s*$`);
  if (!restated.test(last.text)) return parts;
  const rest = last.text.replace(restated, "").trimEnd();
  return rest ? [...parts.slice(0, -1), { ...last, text: rest }] : parts.slice(0, -1);
}

const questionPrompt = (part: Part) =>
  part.type === "dynamic-tool" && isAsk(part) && part.toolMetadata?.eve?.inputRequest?.kind === "question"
    ? part.toolMetadata.eve.inputRequest.prompt
    : undefined;

// The ids minted here must stay stable across refreshes, or replies duplicate.
export function withQuestionReplies(messages: readonly EveMessage[], sent: SentAnswers = new Map()): EveMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "assistant") return [message];
    const projected: EveMessage[] = [];
    let parts: EveMessage["parts"][number][] = [];
    let id = message.id;

    for (const part of message.parts) {
      const prompt = questionPrompt(part);
      if (prompt !== undefined) parts = withoutRestatement(parts, prompt);
      const reply = part.type === "dynamic-tool" ? answeredQuestion(part, sent) : undefined;
      if (!reply || part.type !== "dynamic-tool") {
        parts.push(part);
        continue;
      }

      parts.push({ type: "text", text: reply.question, state: "done" });
      projected.push(
        { ...message, id, parts, metadata: { ...message.metadata, status: "complete" } },
        {
          id: `${message.id}:question:${part.toolCallId}:reply`,
          role: "user",
          parts: [{ type: "text", text: reply.answer, state: "done" }],
          metadata: { status: "complete", turnId: message.metadata?.turnId },
        },
      );
      id = `${message.id}:after-question:${part.toolCallId}`;
      parts = [];
    }

    if (projected.length === 0) {
      const unchanged = parts.length === message.parts.length && parts.every((part, i) => part === message.parts[i]);
      return [unchanged ? message : { ...message, parts }];
    }
    if (parts.length || message.metadata?.status === "streaming") {
      projected.push({ ...message, id, parts });
    }
    return projected;
  });
}
