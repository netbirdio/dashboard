import { test, expect } from "bun:test";
import type { ModelMessage } from "ai";
import { parseSuggestions } from "@/suggestions.ts";
import { validateComponent, COMPONENT_NAMES } from "@/tools/ui.ts";
import { runComponentTool, renderComponentSpec, RENDER_COMPONENT_TOOL } from "@/tools/ui.ts";
import { runAskTool, askUserSpec, validateQuestion, askGate, ASK_USER_TOOL } from "@/tools/ui.ts";
import { isServerTool, TOOLS } from "@/tools/index.ts";

test("parseSuggestions extracts JSON, trims, dedupes, and clamps", () => {
  const raw = `Sure! {"quick_replies":["Yes"," Yes ","No","Maybe","Extra one"],"question":"Enable it now?"}`;
  const s = parseSuggestions(raw, 3);
  expect(s.quick_replies).toEqual(["Yes", "No", "Maybe"]);
  expect(s.question).toBe("Enable it now?");
});

test("parseSuggestions drops a question with no quick replies to title", () => {
  expect(parseSuggestions('{"quick_replies":[],"question":"Which one?"}', 3)).toEqual({
    quick_replies: [],
    question: "",
  });
});

test("parseSuggestions survives fenced/garbled output and bad types", () => {
  expect(parseSuggestions("```json\n{\"quick_replies\":[]}\n```", 3)).toEqual({
    quick_replies: [],
    question: "",
  });
  expect(parseSuggestions("no json here", 3)).toEqual({ quick_replies: [], question: "" });
  expect(parseSuggestions('{"quick_replies":"nope","question":42}', 3)).toEqual({
    quick_replies: [],
    question: "",
  });
});

test("ask_user is a known, server-executed tool", () => {
  expect(ASK_USER_TOOL in TOOLS).toBe(true);
  expect(isServerTool(ASK_USER_TOOL)).toBe(true);
  expect(askUserSpec.name).toBe("ask_user");
});

test("runAskTool accepts a valid question and tells the model to wait", () => {
  const r = runAskTool({
    question: "Which environment?",
    type: "single_select",
    options: [{ label: "Production" }, { label: "Staging" }],
  });
  expect(r.ok).toBe(true);
  expect(r.content).toContain("Wait for their answer");
});

const say = (text: string): ModelMessage => ({ role: "user", content: text });
const toolUse = (name: string): ModelMessage => ({
  role: "assistant",
  content: [{ type: "tool-call", toolCallId: "t1", toolName: name, input: {} }],
});
const toolResult = (name: string, value: string): ModelMessage => ({
  role: "tool",
  content: [
    { type: "tool-result", toolCallId: "t1", toolName: name, output: { type: "text", value } },
  ],
});

test("askGate refuses a question before the model has looked at anything", () => {
  const gate = askGate([say("set up access for contractors")]);
  expect(gate.allowed).toBe(false);
  expect(gate.reason).toContain("read-only tool");
});

test("askGate allows one question once a tool has run", () => {
  expect(askGate([say("hi"), toolUse("list_groups")]).allowed).toBe(true);
});

test("askGate refuses a second question until the user speaks again", () => {
  const asked = [say("hi"), toolUse("list_groups"), toolUse(ASK_USER_TOOL)];

  expect(askGate(asked).allowed).toBe(false);
  expect(askGate(asked).reason).toContain("already asked");

  expect(askGate([...asked, say("Production")]).allowed).toBe(true);
});

test("askGate counts a tool-result turn as transcript, not as the user speaking", () => {
  const gate = askGate([
    say("what's on my canvas?"),
    toolUse("cc_state"),
    toolResult("cc_state", "{}"),
    toolUse(ASK_USER_TOOL),
    toolResult(ASK_USER_TOOL, "ok"),
  ]);
  expect(gate.allowed).toBe(false);
});

test("askGate still allows a question after a plain read", () => {
  const gate = askGate([
    say("who can reach staging?"),
    toolUse("list_policies"),
    toolResult("list_policies", "[]"),
  ]);
  expect(gate.allowed).toBe(true);
});

test("runAskTool rejects bad shapes with a recoverable error", () => {
  const tooFew = runAskTool({ question: "Which?", type: "single_select", options: [{ label: "Only one" }] });
  expect(tooFew.ok).toBe(false);
  expect(tooFew.content).toContain("ask_user");

  expect(runAskTool({ question: "Which?", type: "dropdown", options: [{ label: "A" }, { label: "B" }] }).ok).toBe(false);
  expect(validateQuestion({ question: "Which?", type: "multi_select", options: [{ label: "Linux" }, { label: " linux " }] }).ok).toBe(false);
  expect(
    validateQuestion({
      question: "Which platforms?",
      type: "multi_select",
      options: [{ label: "Linux" }, { label: "macOS" }, { label: "Windows" }],
    }).ok,
  ).toBe(true);
});

test("validateComponent accepts a well-formed canvas_preview", () => {
  const res = validateComponent({
    component: "canvas_preview",
    title: "New allow-all policy",
    resource: "policy",
    data: { name: "allow-all", enabled: true },
  });
  expect(res.ok).toBe(true);
});

test("validateComponent accepts a resource_table and rejects unknown/invalid", () => {
  expect(validateComponent({ component: "resource_table", columns: ["name", "ip"], ids: ["p1"] }).ok).toBe(true);
  expect(validateComponent({ component: "mystery_widget", data: {} }).ok).toBe(false);
  expect(validateComponent({ component: "resource_table", columns: [], ids: [] }).ok).toBe(false);
  expect(validateComponent({ component: "canvas_preview", resource: "policy", data: {} }).ok).toBe(false);
});

test("COMPONENT_NAMES matches the registry", () => {
  expect([...COMPONENT_NAMES].sort()).toEqual(["canvas_preview", "resource_table"]);
});

test("render_component is a known, server-executed tool", () => {
  expect(RENDER_COMPONENT_TOOL in TOOLS).toBe(true);
  expect(isServerTool(RENDER_COMPONENT_TOOL)).toBe(true);
  expect(renderComponentSpec.name).toBe("render_component");
});

test("runComponentTool confirms a validated component", () => {
  const r = runComponentTool({ component: "resource_table", columns: ["name", "ip"], ids: ["p1"] });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("resource_table");
});

test("runComponentTool rejects an invalid component with a recoverable error", () => {
  const r = runComponentTool({ component: "canvas_preview", resource: "policy" });
  expect(r.ok).toBe(false);
  expect(r.content).toContain("Invalid component");
  expect(r.content).toContain("render_component");
});

test("validateQuestion rejects two questions joined by 'and'", () => {
  const compound = validateQuestion({
    question: "Who are the players, and what port?",
    type: "single_select",
    options: [{ label: "Existing group" }, { label: "Using port 25565" }],
  });
  expect(compound.ok).toBe(false);
  if (!compound.ok) expect(compound.error).toContain("two questions");
});

test("validateQuestion keeps a single question that merely offers alternatives", () => {
  const fine = validateQuestion({
    question: "Should this be TCP or UDP?",
    type: "single_select",
    options: [{ label: "TCP" }, { label: "UDP" }],
  });
  expect(fine.ok).toBe(true);
});
