import { expect, test } from "bun:test";
import { lastUserText, shouldBlockInput } from "@/agent/guardrails.ts";
import { setEnv } from "./env.ts";

setEnv();

const userMessage = (text: string, id = "m1") => ({
  id,
  role: "user" as const,
  parts: [{ type: "text" as const, text }],
});

test("lastUserText joins the newest user message's text parts", () => {
  const messages = [
    userMessage("first", "m1"),
    { id: "m2", role: "assistant" as const, parts: [{ type: "text" as const, text: "reply" }] },
    userMessage("second", "m3"),
  ];
  expect(lastUserText(messages)).toBe("second");
  expect(lastUserText([])).toBe("");
});

test("shouldBlockInput is a no-op while the classifier is disabled", async () => {
  // No model call, so nothing to bill either.
  expect(await shouldBlockInput("hi")).toEqual({ blocked: false });
});

test("an empty message is not screened even with the classifier on", async () => {
  setEnv({ GUARDRAIL_INPUT_CLASSIFIER: "true" });
  expect(await shouldBlockInput("")).toEqual({ blocked: false });
  setEnv();
});
