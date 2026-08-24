import { MockLanguageModelV3 } from "ai/test";
import { beforeEach, expect, test } from "bun:test";
import { skillNames } from "@/agent/skills.ts";
import { TOOLS } from "@/agent/tools/registry.ts";
import { CASES, type RoutingCase } from "../evals/cases.ts";
import { runCase, specOnlyTools } from "../evals/run.ts";
import { setEnv } from "./env.ts";

beforeEach(() => setEnv());

// A model that requests exactly the given skills, plus any other tools named.
function modelCalling(skills: string[], ...alsoCall: string[]): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [
        ...skills.map((skill, i) => ({
          type: "tool-call" as const,
          toolCallId: `s${i}`,
          toolName: "load_skill",
          input: JSON.stringify({ skill }),
        })),
        ...alsoCall.map((toolName, i) => ({
          type: "tool-call" as const,
          toolCallId: `t${i}`,
          toolName,
          input: "{}",
        })),
      ],
      finishReason: { unified: "tool-calls" as const, raw: "tool_use" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 5, reasoning: 0 },
      },
      warnings: [],
    }),
  });
}

type ToolExpectations = Pick<RoutingCase, "expectTools" | "forbidTools">;

const kase = (expected: string[], tools: Partial<ToolExpectations> = {}): RoutingCase => ({
  query: "q",
  expect: expected,
  why: "test",
  ...tools,
});

test("scores an exact match as a pass", async () => {
  const r = await runCase(kase(["access-control"]), modelCalling(["access-control"]), "sys", specOnlyTools());
  expect(r.error).toBeUndefined();
  expect(r.loaded).toEqual(["access-control"]);
  expect(r.ok).toBe(true);
});

test("a missing guide fails and is reported", async () => {
  const r = await runCase(kase(["dns-resolution"]), modelCalling([]), "sys", specOnlyTools());
  expect(r.ok).toBe(false);
  expect(r.missing).toEqual(["dns-resolution"]);
  expect(r.extra).toEqual([]);
});

// Over-loading costs a step and pulls in irrelevant context, so it must not pass.
test("an unnecessary guide fails on precision", async () => {
  const r = await runCase(kase([]), modelCalling(["reverse-proxy"]), "sys", specOnlyTools());
  expect(r.ok).toBe(false);
  expect(r.extra).toEqual(["reverse-proxy"]);
});

test("multi-guide cases need every expected guide", async () => {
  const both = kase(["access-control", "control-center"]);
  expect((await runCase(both, modelCalling(["control-center"]), "sys", specOnlyTools())).ok).toBe(false);
  expect(
    (await runCase(both, modelCalling(["access-control", "control-center"]), "sys", specOnlyTools())).ok,
  ).toBe(true);
});

// A case that says nothing about tools opts out of that dimension entirely.
test("tools called alongside the guide are recorded, not scored", async () => {
  const r = await runCase(
    kase(["access-control"]),
    modelCalling(["access-control"], "list_peers", "open_page"),
    "sys",
    specOnlyTools(),
  );
  expect(r.ok).toBe(true);
  expect(r.otherTools).toEqual(["list_peers", "open_page"]);
  expect(r.missingTools).toEqual([]);
  expect(r.forbidden).toEqual([]);
});

test("scores both dimensions when a case names tools", async () => {
  const r = await runCase(
    kase([], { expectTools: ["list_peers"], forbidTools: ["open_page"] }),
    modelCalling([], "list_peers"),
    "sys",
    specOnlyTools(),
  );
  expect(r.ok).toBe(true);
  expect(r.missingTools).toEqual([]);
  expect(r.forbidden).toEqual([]);
});

// Routing the guide right is half the verdict: the wrong tool is still wrong.
test("a forbidden tool fails a correctly routed case", async () => {
  const r = await runCase(
    kase(["access-control"], { forbidTools: ["open_page"] }),
    modelCalling(["access-control"], "open_page"),
    "sys",
    specOnlyTools(),
  );
  expect(r.missing).toEqual([]);
  expect(r.extra).toEqual([]);
  expect(r.forbidden).toEqual(["open_page"]);
  expect(r.ok).toBe(false);
});

test("an expected tool that was never called fails", async () => {
  const r = await runCase(
    kase([], { expectTools: ["list_peers", "get_current_user"] }),
    modelCalling([], "list_peers"),
    "sys",
    specOnlyTools(),
  );
  expect(r.ok).toBe(false);
  expect(r.missingTools).toEqual(["get_current_user"]);
});

// Nothing may execute during an eval — a spec-only set is what guarantees it.
test("the eval tool set carries no executable tools", () => {
  const set = specOnlyTools();
  expect(Object.keys(set).length).toBeGreaterThan(20);
  for (const [name, t] of Object.entries(set)) {
    expect(t.execute, `${name} must not be executable in an eval`).toBeUndefined();
  }
});

test("every case names a real skill, and every skill is covered", () => {
  const expected = new Set(CASES.flatMap((c) => c.expect));
  for (const s of expected) expect(skillNames).toContain(s);
  for (const s of skillNames) expect([...expected]).toContain(s);
  // Negative cases matter as much as positive ones.
  expect(CASES.filter((c) => c.expect.length === 0).length).toBeGreaterThanOrEqual(3);
});

// A renamed or deleted tool would otherwise leave a case scoring an
// expectation no model can ever meet.
test("every tool named in a case is a real registered tool", () => {
  const named = CASES.flatMap((c) => [...(c.expectTools ?? []), ...(c.forbidTools ?? [])]);
  for (const t of named) expect(Object.keys(TOOLS)).toContain(t);
  expect(CASES.filter((c) => c.expectTools?.length).length).toBeGreaterThanOrEqual(5);
  expect(CASES.filter((c) => c.forbidTools?.length).length).toBeGreaterThanOrEqual(5);
});
