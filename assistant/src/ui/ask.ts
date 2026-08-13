/**
 * The `ask_user` tool: a clarifying question the user answers by tapping, not by
 * typing. Server-executed like `render_component`, but unlike it this one *ends
 * the turn* — the model asked something, so there is nothing further to say until
 * an answer comes back. The chat route sees `endsTurn` and closes the stream after
 * the question is emitted (see routes/chat.ts).
 *
 * Two shapes, and the difference is about the world rather than the UI:
 * `single_select` when the answers are mutually exclusive in reality,
 * `multi_select` when they genuinely co-occur. The frontend renders the question
 * as a card above the composer; the user's pick comes back as an ordinary user
 * message, so no state is held across turns.
 */
import { z } from "zod";
import type { LlmContentBlock, LlmMessage, LlmTool } from "@/types.ts";
import type { ServerToolResult } from "@/llm/serverTools.ts";

export const ASK_USER_TOOL = "ask_user";

export const QUESTION_TYPES = ["single_select", "multi_select"] as const;

/** One tappable answer. Short enough to read at a glance in a chat panel. */
const Option = z.object({
  label: z.string().min(1).max(40),
  /** Rarely needed — an option that requires one is usually the wrong option. */
  description: z.string().max(80).optional(),
});

export const QuestionSchema = z.object({
  question: z.string().min(1).max(160),
  type: z.enum(QUESTION_TYPES),
  options: z.array(Option).min(2).max(4),
});

export type Question = z.infer<typeof QuestionSchema>;

export type QuestionValidation =
  | { ok: true; question: Question }
  | { ok: false; error: string };

/**
 * Two questions wearing one question mark: "Who are the players, and what port?"
 * The option list can then only answer one of them, and the card offered a group,
 * a peer and a port number side by side — unanswerable.
 *
 * Keyed on `and` followed by an interrogative, which a single question almost
 * never contains. `or` is deliberately absent: "TCP or UDP?" is one question.
 */
const COMPOUND_QUESTION =
  /\band\s+(?:what|which|who|whom|whose|where|when|how|why|should)\b/i;

export function validateQuestion(json: unknown): QuestionValidation {
  const parsed = QuestionSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  if (COMPOUND_QUESTION.test(parsed.data.question)) {
    return {
      ok: false,
      error:
        "That's two questions in one, so the options can only answer half of it. Ask the single " +
        "thing that actually blocks you — or start on the work and let the user correct you.",
    };
  }
  const labels = parsed.data.options.map((o) => o.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) {
    return { ok: false, error: "options must be distinct" };
  }
  return { ok: true, question: parsed.data };
}

/** Tool spec advertised to the model. Zod (validateQuestion) is the real gate. */
export const askUserSpec: LlmTool = {
  name: ASK_USER_TOOL,
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
  inputSchema: {
    type: "object",
    properties: {
      question: { type: "string", description: "The question, as one short line." },
      type: {
        type: "string",
        enum: [...QUESTION_TYPES],
        description: "single_select when only one answer can be true; multi_select when several can.",
      },
      options: {
        type: "array",
        description:
          "Two to four distinct answers. One to four words each, sentence case, no trailing punctuation. Each must lead to a " +
          "different next action; prefer real values from a tool result over invented categories. When an option names a " +
          "resource, write its placeholder verbatim ({PEER_1}) — the dashboard swaps it for the real name, and a hand-written " +
          "label like \"Peer 1\" tells the user nothing.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "What the user reads and taps." },
            description: { type: "string", description: "Rarely needed. Omit unless the label truly can't stand alone." },
          },
          required: ["label"],
        },
      },
    },
    required: ["question", "type", "options"],
  },
};

const blocksOf = (message: LlmMessage): LlmContentBlock[] =>
  typeof message.content === "string" ? [] : message.content;

/**
 * Whether a user message is the user actually SPEAKING, as opposed to the
 * transcript's tool_result turns (which are also role: "user" on the wire).
 */
const isUserSpeech = (message: LlmMessage): boolean =>
  message.role === "user" &&
  (typeof message.content === "string"
    ? message.content.trim().length > 0
    : message.content.some((b) => b.type === "text"));

/**
 * Whether the model has earned a question, judged from the transcript.
 *
 * The prompt asks for restraint and doesn't get it: a model that can ask
 * reaches for it, because asking always feels safer than assuming. So the two
 * rules that matter are enforced rather than requested — this is the same
 * enforcement-not-trust line the component contract takes.
 *
 * Both denials are recoverable: the model gets an error tool_result explaining
 * itself and answers in the same turn.
 */
export function askGate(
  messages: LlmMessage[],
  /**
   * The content of the turn making the call. A question card is dismissible and
   * the question lives nowhere else, so a card with no accompanying text can
   * leave the user with an empty prompt and no way back to it.
   */
  currentTurn: LlmContentBlock[] = [],
): {
  allowed: boolean;
  reason: string;
} {
  const saidSomething = currentTurn.some(
    (b) => b.type === "text" && b.text.trim().length > 0,
  );
  let sawTool = false;
  let askedSinceUserSpoke = false;

  /*
    ONE question per thing the user says, rather than one per conversation.

    Per-conversation was too tight and failed in a specific, bad way: having
    spent its question, the model needed to know WHICH existing peer to point a
    policy at, couldn't ask, and picked one. A silent guess between real account
    entities is worse than a question. Answering a question is itself a user
    turn, so a conversation that keeps moving keeps earning them.
  */
  for (const message of messages) {
    if (isUserSpeech(message)) askedSinceUserSpoke = false;
    for (const block of blocksOf(message)) {
      if (block.type !== "tool_use") continue;
      if (block.name === ASK_USER_TOOL) askedSinceUserSpoke = true;
      sawTool = true;
    }
  }

  if (currentTurn.length > 0 && !saidSomething) {
    return {
      allowed: false,
      reason:
        "You called this without saying anything first. The card can be dismissed and the question isn't written anywhere else, so ask in one line of text as well, then call this for the tappable options.",
    };
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

/** Validate an ask_user call and, if valid, emit it as a `question` event. */
export function runAskTool(input: unknown): ServerToolResult {
  const res = validateQuestion(input);
  if (!res.ok) {
    return {
      ok: false,
      content: `Invalid question: ${res.error}. Fix the fields and call ${ASK_USER_TOOL} again, or just ask in Markdown.`,
      summary: "Question rejected",
    };
  }
  const { question, type, options } = res.question;
  return {
    ok: true,
    content: "Question shown to the user. Wait for their answer.",
    summary: "Waiting for your answer",
    // `questionType`, not `type`: the SSE frame's event name arrives as `type`,
    // so a payload field of that name would overwrite it on the client.
    emit: { event: "question", data: { question, questionType: type, options } },
    endsTurn: true,
  };
}
