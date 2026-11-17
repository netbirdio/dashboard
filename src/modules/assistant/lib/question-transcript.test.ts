import type { EveMessage } from "eve/react";
import { describe, expect, it } from "vitest";
import { withQuestionReplies } from "./question-transcript";

const asking = (text: string, prompt: string): EveMessage =>
  ({
    id: "m1",
    role: "assistant",
    parts: [
      { type: "text", text, state: "done" },
      {
        type: "dynamic-tool",
        toolName: "ask_question",
        toolCallId: "call-1",
        toolMetadata: { eve: { inputRequest: { kind: "question", requestId: "r1", prompt } } },
      },
    ],
    metadata: { status: "streaming" },
  }) as unknown as EveMessage;

const textOf = (message: EveMessage) =>
  message.parts.flatMap((part) => (part.type === "text" ? [part.text] : []));

describe("a question the assistant restated before asking it", () => {
  it("is dropped without flattening the text before it", () => {
    const [message] = withQuestionReplies([asking("Steps:\n\n- First\n- Second\n\nContinue  with\nthis?", "Continue with this?")]);
    expect(textOf(message)).toEqual(["Steps:\n\n- First\n- Second"]);
  });

  it("takes the whole part away when nothing else was said", () => {
    const [message] = withQuestionReplies([asking("Continue (y/n)?", "Continue (y/n)?")]);
    expect(textOf(message)).toEqual([]);
  });

  it("leaves text that does not end in the question alone", () => {
    const [message] = withQuestionReplies([asking("Continue? Maybe.", "Continue?")]);
    expect(textOf(message)).toEqual(["Continue? Maybe."]);
  });
});
