import { test, expect } from "bun:test";
import { parseSuggestions } from "@/llm/suggestions.ts";
import { validateComponent, COMPONENT_NAMES } from "@/ui/components.ts";
import { runComponentTool, renderComponentSpec, RENDER_COMPONENT_TOOL } from "@/ui/render.ts";
import { runAskTool, askUserSpec, validateQuestion, askGate, ASK_USER_TOOL } from "@/ui/ask.ts";
import { isServerTool, isKnownTool, isMutating } from "@/llm/tools.ts";

// ── suggestions parsing (pure, tolerant) ─────────────────────────────────────

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

// ── ask_user: the clarifying-question tool ───────────────────────────────────

test("ask_user is a known, non-mutating, server-executed tool", () => {
  expect(isKnownTool(ASK_USER_TOOL)).toBe(true);
  expect(isServerTool(ASK_USER_TOOL)).toBe(true);
  expect(isMutating(ASK_USER_TOOL)).toBe(false);
  expect(askUserSpec.name).toBe("ask_user");
});

test("runAskTool emits a validated question and ends the turn", () => {
  const r = runAskTool({
    question: "Which environment?",
    type: "single_select",
    options: [{ label: "Production" }, { label: "Staging" }],
  });
  expect(r.ok).toBe(true);
  expect(r.endsTurn).toBe(true);
  expect(r.emit?.event).toBe("question");
  // `questionType` — a payload `type` would collide with the SSE event name.
  expect(r.emit?.data).toMatchObject({ question: "Which environment?", questionType: "single_select" });
});

// ── ask_user: when the model is allowed to ask at all ────────────────────────

const toolUse = (name: string) => ({
  role: "assistant" as const,
  content: [{ type: "tool_use" as const, id: "t1", name, input: {} }],
});

test("askGate refuses a question before the model has looked at anything", () => {
  const gate = askGate([{ role: "user", content: "set up access for contractors" }]);
  expect(gate.allowed).toBe(false);
  expect(gate.reason).toContain("read-only tool");
});

test("askGate allows one question once a tool has run", () => {
  expect(askGate([{ role: "user", content: "hi" }, toolUse("list_groups")]).allowed).toBe(true);
});

test("askGate refuses a second question until the user speaks again", () => {
  const asked = [
    { role: "user" as const, content: "hi" },
    toolUse("list_groups"),
    toolUse(ASK_USER_TOOL),
  ];

  // Nothing from the user since the question — no stacking another on top.
  expect(askGate(asked).allowed).toBe(false);
  expect(askGate(asked).reason).toContain("already asked");

  // Their answer is a turn of their own, so the next decision may be asked
  // about rather than guessed at.
  expect(
    askGate([...asked, { role: "user", content: "Production" }]).allowed,
  ).toBe(true);
});

test("runAskTool rejects bad shapes with a recoverable error (no emit)", () => {
  const tooFew = runAskTool({ question: "Which?", type: "single_select", options: [{ label: "Only one" }] });
  expect(tooFew.ok).toBe(false);
  expect(tooFew.emit).toBeUndefined();
  expect(tooFew.content).toContain("ask_user"); // tells the model how to recover

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

// ── component contract ───────────────────────────────────────────────────────

test("validateComponent accepts a well-formed canvas_preview with an action", () => {
  const res = validateComponent({
    component: "canvas_preview",
    title: "New allow-all policy",
    resource: "policy",
    data: { name: "allow-all", enabled: true },
    action: { label: "Apply", tool: "create_policy", input: { name: "allow-all" } },
  });
  expect(res.ok).toBe(true);
});

test("validateComponent accepts a resource_table and rejects unknown/invalid", () => {
  expect(validateComponent({ component: "resource_table", resource: "peer", columns: ["name", "ip"], ids: ["p1"] }).ok).toBe(true);
  expect(validateComponent({ component: "mystery_widget", data: {} }).ok).toBe(false);
  expect(validateComponent({ component: "resource_table", resource: "peer", columns: [], ids: [] }).ok).toBe(false); // empty columns/ids
  expect(validateComponent({ component: "canvas_preview", resource: "policy", data: {} }).ok).toBe(false); // missing title
});

test("COMPONENT_NAMES matches the registry", () => {
  expect([...COMPONENT_NAMES].sort()).toEqual(["canvas_preview", "resource_table"]);
});

// ── render_component tool: enforcement + side-channel emit ───────────────────

test("render_component is a known, non-mutating, server-executed tool", () => {
  expect(isKnownTool(RENDER_COMPONENT_TOOL)).toBe(true);
  expect(isServerTool(RENDER_COMPONENT_TOOL)).toBe(true);
  expect(isMutating(RENDER_COMPONENT_TOOL)).toBe(false);
  expect(renderComponentSpec.name).toBe("render_component");
});

test("runComponentTool emits a validated component on success", () => {
  const r = runComponentTool({ component: "resource_table", resource: "peer", columns: ["name", "ip"], ids: ["p1"] });
  expect(r.ok).toBe(true);
  expect(r.emit?.event).toBe("component");
  expect(r.emit?.data).toMatchObject({ component: "resource_table", resource: "peer" });
});

test("runComponentTool rejects an invalid component with a recoverable error (no emit)", () => {
  const r = runComponentTool({ component: "canvas_preview", resource: "policy" }); // missing title/data
  expect(r.ok).toBe(false);
  expect(r.emit).toBeUndefined();
  expect(r.content).toContain("Invalid component");
  expect(r.content).toContain("render_component"); // tells the model how to recover
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

test("askGate refuses a second question before the user has spoken again", () => {
  const gate = askGate([
    { role: "user", content: "set up minecraft access" },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t1", name: "list_peers", input: {} }],
    },
    { role: "user", content: [{ type: "tool_result", toolUseId: "t1", content: "[]" }] },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t2", name: "ask_user", input: {} }],
    },
  ]);
  expect(gate.allowed).toBe(false);
  expect(gate.reason).toContain("already asked");
});

test("askGate allows a question again once the user answers", () => {
  const gate = askGate([
    { role: "user", content: "set up minecraft access" },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t1", name: "list_peers", input: {} }],
    },
    { role: "user", content: [{ type: "tool_result", toolUseId: "t1", content: "[]" }] },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t2", name: "ask_user", input: {} }],
    },
    // The answer arrives as an ordinary user message — a new turn, so choosing
    // between real peers can be asked instead of guessed.
    { role: "user", content: "point to an existing peer" },
  ]);
  expect(gate.allowed).toBe(true);
});

test("askGate still allows a question after a plain read", () => {
  const gate = askGate([
    { role: "user", content: "who can reach staging?" },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t1", name: "list_policies", input: {} }],
    },
    { role: "user", content: [{ type: "tool_result", toolUseId: "t1", content: "[]" }] },
  ]);
  expect(gate.allowed).toBe(true);
});

test("askGate counts a tool_result turn as transcript, not as the user speaking", () => {
  const gate = askGate([
    { role: "user", content: "what's on my canvas?" },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t1", name: "cc_state", input: {} }],
    },
    { role: "user", content: [{ type: "tool_result", toolUseId: "t1", content: "{}" }] },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t2", name: "ask_user", input: {} }],
    },
    // Another tool_result — not the user, so the question isn't refreshed.
    { role: "user", content: [{ type: "tool_result", toolUseId: "t2", content: "ok" }] },
  ]);
  expect(gate.allowed).toBe(false);
});

test("askGate refuses a question card with no text alongside it", () => {
  const history = [
    { role: "user" as const, content: "who can reach the server?" },
    toolUse("list_peers"),
  ];

  // Card only — dismissing it would leave the user with nothing to answer.
  const silent = askGate(history, [
    { type: "tool_use", id: "t2", name: ASK_USER_TOOL, input: {} },
  ]);
  expect(silent.allowed).toBe(false);
  expect(silent.reason).toContain("without saying anything first");

  // The same call with a line of context is fine.
  const spoken = askGate(history, [
    { type: "text", text: "Three peers could be the host." },
    { type: "tool_use", id: "t2", name: ASK_USER_TOOL, input: {} },
  ]);
  expect(spoken.allowed).toBe(true);
});
