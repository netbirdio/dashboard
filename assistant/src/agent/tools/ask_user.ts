import type { ModelMessage } from "ai";
import { z } from "zod";
import { defineTool, type ServerToolResult, type ToolContext } from "@/agent/tools/_contract.ts";

export const ASK_USER_TOOL = "ask_user";

const QUESTION_TYPES = ["single_select", "multi_select"] as const;

const Option = z.object({
  label: z.string().min(1).max(40).describe("What the user reads and taps."),
  description: z
    .string()
    .max(80)
    .optional()
    .describe("Rarely needed. Omit unless the label truly can't stand alone."),
});

const QuestionSchema = z.object({
  question: z.string().min(1).max(160).describe("The question, as one short line."),
  type: z
    .enum(QUESTION_TYPES)
    .describe("single_select when only one answer can be true; multi_select when several can."),
  options: z
    .array(Option)
    .min(2)
    .max(4)
    .describe(
      "Two to four distinct answers. One to four words each, sentence case, no trailing punctuation. Each must lead to a " +
        "different next action; prefer real values from a tool result over invented categories. When an option names a " +
        "resource, write its real name exactly as the tool result gave it — a paraphrased label tells the user nothing.",
    ),
});

export type Question = z.infer<typeof QuestionSchema>;

export type QuestionValidation =
  | { ok: true; question: Question }
  | { ok: false; error: string };

const COMPOUND_QUESTION =
  /\band\s+(?:what|which|who|whom|whose|where|when|how|why|should)\b/i;

// The two rules the schema cannot carry: one question per card, and options a
// user can tell apart.
export function validateQuestion(question: Question): QuestionValidation {
  if (COMPOUND_QUESTION.test(question.question)) {
    return {
      ok: false,
      error:
        "That's two questions in one, so the options can only answer half of it. Ask the single " +
        "thing that actually blocks you — or start on the work and let the user correct you.",
    };
  }
  const labels = question.options.map((o) => o.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) {
    return { ok: false, error: "options must be distinct" };
  }
  return { ok: true, question };
}

// Put one clarifying question in front of the user as tappable
// options, gated so the model can't ask before it has looked at the account.
export default defineTool({
  runtime: "server",
  description:
    "Ask the user one clarifying question with two to four tappable options, instead of writing the choices as prose. " +
    "Use `single_select` when the answers are mutually exclusive in reality (an environment: production or staging) and " +
    "`multi_select` when they genuinely co-occur (platforms a policy covers). If you want to add \"both\" or \"all of them\" " +
    "as an option, you picked the wrong type. " +
    "Use it sparingly — most turns should not call it, and NOT asking is the default. Three things must all be true: the " +
    "missing detail changes what you would actually do, nothing else can supply it (not a read-only tool, not the " +
    "conversation, not the user's own wording), and you can write down the complete set of real answers. That last one is " +
    "the usual reason not to ask: if the right answer might not be in your list, or you'd want an \"other\" escape hatch, " +
    "then a picker is the wrong shape for it — say what you assumed in one sentence instead and let the user correct you. " +
    "Never show a selection just to be polite about a decision you could make. The one thing you must NOT do instead of " +
    "asking is quietly pick one of the user's real resources — which of their peers, groups or networks to act on is " +
    "theirs to choose when it genuinely could be any of them. " +
    "If the answer is a specific value rather than a choice — a name, an address, a port, a description, anything whose options " +
    "you would have to invent — do not call this at all: ask for it in one plain sentence, or assume and say so. " +
    "ONE question, never two joined by \"and\": every option must be an answer to the same question, so if your list mixes " +
    "answers to different ones (a group, a device, a port number) you asked two and the card is unanswerable. Pick the one " +
    "that actually blocks you and assume the rest out loud. " +
    "Asking ends your turn — say your one line of context first, then call this last.",
  input: QuestionSchema,
  invalidHint: "or just ask in Markdown.",
  execute: runAskTool,
});
const userSpoke = (message: ModelMessage): boolean =>
  message.role === "user" &&
  (typeof message.content === "string"
    ? message.content.trim().length > 0
    : message.content.some((part) => part.type === "text" && part.text.trim().length > 0));

export function askGate(messages: ModelMessage[]): { allowed: boolean; reason: string } {
  let sawTool = false;
  let askedSinceUserSpoke = false;

  for (const message of messages) {
    if (userSpoke(message)) askedSinceUserSpoke = false;
    if (message.role !== "assistant" || typeof message.content === "string") continue;
    for (const part of message.content) {
      if (part.type !== "tool-call") continue;
      sawTool = true;
      if (part.toolName === ASK_USER_TOOL) askedSinceUserSpoke = true;
    }
  }

  if (askedSinceUserSpoke) {
    return {
      allowed: false,
      reason:
        "You've already asked since the user last said anything. Don't stack another question on top — act on what you have, say in one clause what you assumed, and let them correct you.",
    };
  }

  if (!sawTool) {
    return {
      allowed: false,
      reason:
        "You haven't looked at the account yet. Call a read-only tool first — the answer to your question is usually in the data. Ask only if it still depends on something only the user could know.",
    };
  }

  return { allowed: true, reason: "" };
}

function runAskTool(input: Question, { messages }: ToolContext): ServerToolResult {
  const gate = askGate(messages);
  if (!gate.allowed) return { ok: false, content: gate.reason, summary: "Question rejected" };

  const res = validateQuestion(input);
  if (!res.ok) {
    return {
      ok: false,
      content: `Invalid question: ${res.error}. Fix the fields and call ${ASK_USER_TOOL} again, or just ask in Markdown.`,
      summary: "Question rejected",
    };
  }
  return {
    ok: true,
    content: "Question shown to the user. Wait for their answer.",
    summary: "Waiting for your answer",
  };
}
