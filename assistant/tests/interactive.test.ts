import type { ModelMessage } from "ai";
import { expect, test } from "bun:test";
import { ASK_USER_TOOL, askGate, validateQuestion } from "@/agent/tools/ask_user.ts";
import { isServerTool, runServerTool, TOOLS } from "@/agent/tools/registry.ts";
import { COMPONENT_NAMES, validateComponent } from "@/agent/tools/render_component.ts";
import { RENDER_COMPONENT_TOOL } from "@/agent/tools/render_component.ts";

test("ask_user is a known, server-executed tool", () => {
  expect(ASK_USER_TOOL in TOOLS).toBe(true);
  expect(isServerTool(ASK_USER_TOOL)).toBe(true);
});

const GATE_OPEN: ModelMessage[] = [
  { role: "user", content: "which env?" },
  { role: "assistant", content: [{ type: "tool-call", toolCallId: "t1", toolName: "list_peers", input: {} }] },
];

test("ask_user accepts a valid question and tells the model to wait", async () => {
  const r = await runServerTool(ASK_USER_TOOL, {
    question: "Which environment?",
    type: "single_select",
    options: [{ label: "Production" }, { label: "Staging" }],
  }, { messages: GATE_OPEN });
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

test("ask_user rejects bad shapes with a recoverable error", async () => {
  const ask = (input: unknown) => runServerTool(ASK_USER_TOOL, input, { messages: GATE_OPEN });

  const tooFew = await ask({ question: "Which?", type: "single_select", options: [{ label: "Only one" }] });
  expect(tooFew.ok).toBe(false);
  expect(tooFew.content).toContain("ask_user");

  expect((await ask({ question: "Which?", type: "dropdown", options: [{ label: "A" }, { label: "B" }] })).ok).toBe(false);
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
});

test("render_component confirms a validated component", async () => {
  const r = await runServerTool(RENDER_COMPONENT_TOOL, { component: "resource_table", columns: ["name", "ip"], ids: ["p1"] });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("resource_table");
});

test("render_component rejects an invalid component with a recoverable error", async () => {
  const r = await runServerTool(RENDER_COMPONENT_TOOL, { component: "canvas_preview", resource: "policy" });
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
