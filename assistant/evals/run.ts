// Runs the routing cases against a real model and scores two dimensions of the
// first tool batch: which guides the model reached for, and which tools it
// reached for. Not part of `bun test`: it makes paid API calls, so it is a
// deliberate command rather than something CI trips over.
//
//   bun run eval                    # the configured main model
//   bun run eval claude-haiku-4-5   # any model id
//
// Guidance followed here:
// https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
import { generateText, jsonSchema, type LanguageModel, stepCountIs, tool, type ToolSet } from "ai";
import { anthropic } from "@/agent/model.ts";
import { TOOLS } from "@/agent/tools/registry.ts";
import { loadConfig } from "@/config.ts";
import { CASES, type RoutingCase } from "./cases.ts";

const CONCURRENCY = 4;

// Spec-only: dropping `execute` means a requested tool is reported but never
// runs, so an eval can't fetch a doc or mutate anything.
export function specOnlyTools(): ToolSet {
  const set: ToolSet = {};
  for (const [name, def] of Object.entries(TOOLS)) {
    set[name] = tool({
      description: def.description,
      inputSchema: jsonSchema<Record<string, unknown>>(
        def.inputSchema as Parameters<typeof jsonSchema>[0],
      ),
    });
  }
  return set;
}

interface Result {
  kase: RoutingCase;
  loaded: string[];
  called: string[];
  otherTools: string[];
  missing: string[];
  extra: string[];
  missingTools: string[];
  forbidden: string[];
  ok: boolean;
  error?: string;
}

export async function runCase(
  kase: RoutingCase,
  model: LanguageModel,
  system: string,
  tools: ToolSet,
): Promise<Result> {
  const base = {
    kase,
    loaded: [],
    called: [],
    otherTools: [],
    missing: [],
    extra: [],
    missingTools: [],
    forbidden: [],
    ok: false,
  };
  try {
    // One step is all that matters: the guide has to be requested in the first
    // batch, which is what the system prompt tells the model to do.
    const res = await generateText({
      model,
      system,
      prompt: kase.query,
      tools,
      stopWhen: stepCountIs(1),
      maxOutputTokens: 1024,
    });

    const calls = res.steps[0]?.toolCalls ?? [];
    const loaded = calls
      .filter((c) => c.toolName === "load_skill")
      .map((c) => String((c.input as { skill?: unknown })?.skill ?? "?"))
      .sort();
    const called = calls.map((c) => c.toolName);
    const otherTools = called.filter((n) => n !== "load_skill");

    const missing = kase.expect.filter((s) => !loaded.includes(s));
    const extra = loaded.filter((s) => !kase.expect.includes(s));
    // Unset expectations score nothing, so a case can opt out of either
    // dimension without opting out of the other.
    const missingTools = (kase.expectTools ?? []).filter((t) => !called.includes(t));
    const forbidden = (kase.forbidTools ?? []).filter((t) => called.includes(t));
    return {
      kase,
      loaded,
      called,
      otherTools,
      missing,
      extra,
      missingTools,
      forbidden,
      ok: !missing.length && !extra.length && !missingTools.length && !forbidden.length,
    };
  } catch (err) {
    return { ...base, error: (err as Error).message };
  }
}

async function main(): Promise<void> {
  const model = process.argv[2] ?? loadConfig().LLM_MAIN_MODEL;
  const system = await Bun.file(new URL("../src/agent/instructions.md", import.meta.url)).text();
  const tools = specOnlyTools();

  console.log(`model: ${model}\ncases: ${CASES.length}\n`);

  const results: Result[] = [];
  const queue = [...CASES];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        results.push(await runCase(next, anthropic()(model), system, tools));
      }
    }),
  );

  // Report in case order, not completion order.
  results.sort((a, b) => CASES.indexOf(a.kase) - CASES.indexOf(b.kase));

  for (const r of results) {
    const mark = r.error ? "ERR " : r.ok ? "pass" : "FAIL";
    console.log(`${mark}  ${r.kase.query}`);
    if (r.error) {
      console.log(`      error: ${r.error}`);
      continue;
    }
    if (r.missing.length || r.extra.length) {
      console.log(`      expected: [${r.kase.expect.join(", ") || "none"}]`);
      console.log(`      loaded:   [${r.loaded.join(", ") || "none"}]`);
      if (r.missing.length) console.log(`      missing:  ${r.missing.join(", ")}`);
      if (r.extra.length) console.log(`      extra:    ${r.extra.join(", ")}`);
    }
    if (r.missingTools.length || r.forbidden.length) {
      console.log(`      called:   [${r.otherTools.join(", ") || "none"}]`);
      if (r.missingTools.length) console.log(`      no call:  ${r.missingTools.join(", ")}`);
      if (r.forbidden.length) console.log(`      unwanted: ${r.forbidden.join(", ")}`);
    }
    if (!r.ok) console.log(`      why:      ${r.kase.why}`);
    if (r.otherTools.length) console.log(`      alongside: ${r.otherTools.join(", ")}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const errored = results.filter((r) => r.error).length;
  const guidesOk = results.filter((r) => !r.error && !r.missing.length && !r.extra.length).length;
  const toolsOk = results.filter(
    (r) => !r.error && !r.missingTools.length && !r.forbidden.length,
  ).length;
  console.log(
    `\n${passed}/${results.length} passed — guides ${guidesOk}, tools ${toolsOk}${errored ? `, ${errored} errored` : ""}`,
  );

  // Per-skill recall, so a single weak description is visible.
  const perSkill = new Map<string, { hit: number; total: number }>();
  for (const r of results) {
    for (const s of r.kase.expect) {
      const cur = perSkill.get(s) ?? { hit: 0, total: 0 };
      perSkill.set(s, { hit: cur.hit + (r.loaded.includes(s) ? 1 : 0), total: cur.total + 1 });
    }
  }
  console.log("\nrecall by guide:");
  for (const [skill, { hit, total }] of [...perSkill].sort()) {
    console.log(`  ${hit === total ? " " : "!"} ${skill}: ${hit}/${total}`);
  }

  // The same view per tool: `called` is recall over the cases that want the
  // tool, `avoided` is precision over the cases that forbid it, so a tool
  // description that reads too broadly shows up as a low second number.
  const perTool = new Map<string, { hit: number; want: number; kept: number; avoid: number }>();
  const stat = (name: string) => {
    const cur = perTool.get(name) ?? { hit: 0, want: 0, kept: 0, avoid: 0 };
    perTool.set(name, cur);
    return cur;
  };
  for (const r of results) {
    for (const t of r.kase.expectTools ?? []) {
      const cur = stat(t);
      cur.want += 1;
      if (r.called.includes(t)) cur.hit += 1;
    }
    for (const t of r.kase.forbidTools ?? []) {
      const cur = stat(t);
      cur.avoid += 1;
      if (!r.called.includes(t)) cur.kept += 1;
    }
  }
  if (perTool.size) {
    console.log("\ntool selection:");
    for (const [name, { hit, want, kept, avoid }] of [...perTool].sort()) {
      const parts = [
        ...(want ? [`called ${hit}/${want}`] : []),
        ...(avoid ? [`avoided ${kept}/${avoid}`] : []),
      ];
      console.log(`  ${hit === want && kept === avoid ? " " : "!"} ${name}: ${parts.join(", ")}`);
    }
  }

  process.exit(passed === results.length ? 0 : 1);
}

if (import.meta.main) await main();
