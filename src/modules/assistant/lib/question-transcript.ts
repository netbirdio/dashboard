import type { EveDynamicToolPart, EveMessage } from "eve/react";

type QuestionReply = { question: string; answer: string };

/** An answer sent but not yet echoed back by the session, keyed by request id. */
export type SentAnswers = ReadonlyMap<string, { optionId?: string; text?: string }>;

// Only the model's own questions are replies in the transcript. A browser tool
// also parks on a question, which the dashboard answers with the call's result.
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

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Drops the model's own restatement of a question from the text just before it:
 * the card shows the question while it is open, and the transcript shows it once
 * after it is answered, so a restatement would always be a duplicate.
 */
function withoutRestatement(parts: Part[], prompt: string): Part[] {
  const last = parts.at(-1);
  const question = normalize(prompt);
  if (last?.type !== "text" || !question) return parts;
  const text = normalize(last.text);
  if (!text.endsWith(question)) return parts;
  const rest = text.slice(0, -question.length).trim();
  return rest ? [...parts.slice(0, -1), { ...last, text: rest }] : parts.slice(0, -1);
}

const questionPrompt = (part: Part) =>
  part.type === "dynamic-tool" && isAsk(part) && part.toolMetadata?.eve?.inputRequest?.kind === "question"
    ? part.toolMetadata.eve.inputRequest.prompt
    : undefined;

/**
 * Projects answered questions, which eve stores as tool results, into the transcript as user messages.
 * The assistant message is split at the question so the reply precedes later assistant text,
 * and stable ids keep refreshes duplicate-free.
 * A sent answer shows at once; the session's own response replaces it under the same ids, so nothing reflows.
 */
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

      // The card disappears once answered, so its question is kept as text to give the answer context.
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
