import type { ModelMessage } from "ai";
import { beforeAll, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { emptyInput, listInput } from "@/agent/tools/_schemas.ts";
import { buildToolSet, isToolFile, runServerTool, TOOLS } from "@/agent/tools/registry.ts";
import { setEnv } from "./env.ts";

beforeAll(() => setEnv());

test("every v1 tool has a complete spec", () => {
  for (const [name, def] of Object.entries(TOOLS)) {
    expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(def.description.length).toBeGreaterThan(10);
    expect(def.inputSchema).toHaveProperty("type", "object");
  }
  expect("list_peers" in TOOLS).toBe(true);
  expect("delete_everything" in TOOLS).toBe(false);
});

// Discovery is a directory read, so a wrong path yields an empty catalog that
// every other assertion here would still pass.
test("discovery finds every tool file in agent/tools", () => {
  const files = readdirSync(new URL("../src/agent/tools/", import.meta.url))
    .filter(isToolFile)
    .map((f) => f.replace(/\.ts$/, ""));
  expect(files.length).toBeGreaterThan(20);
  expect(Object.keys(TOOLS).sort()).toEqual(files.sort());
});

// A file that slipped through would be imported as a tool and, having no
// default export, abort the process at boot.
test("discovery skips this file, the shared machinery and colocated tests", () => {
  for (const name of [
    "registry.ts",
    "_contract.ts",
    "_schemas.ts",
    "list_peers.test.ts",
    "list_peers.spec.ts",
    "types.d.ts",
    "notes.md",
  ]) {
    expect(isToolFile(name)).toBe(false);
  }
  for (const name of ["list_peers.ts", "cc_add.ts", "get_api_reference.ts"]) {
    expect(isToolFile(name)).toBe(true);
  }
});

test("the shared input schemas cannot be mutated out from under their tools", () => {
  const properties = listInput.properties as Record<string, unknown>;
  expect(() => {
    (listInput as Record<string, unknown>).type = "string";
  }).toThrow();
  expect(() => {
    properties.limit = { type: "string" };
  }).toThrow();
  expect(() => {
    (emptyInput as Record<string, unknown>).properties = { secret: {} };
  }).toThrow();

  expect(listInput.type).toBe("object");
  expect((properties.limit as Record<string, unknown>).type).toBe("number");
  expect(emptyInput.properties).toEqual({});
});

test("buildToolSet gives server tools an execute and leaves client tools to the dashboard", () => {
  const set = buildToolSet();
  expect(Object.keys(set).length).toBe(Object.keys(TOOLS).length);
  expect(set.search_docs?.execute).toBeDefined();
  expect(set.ask_user?.execute).toBeDefined();
  expect(set.render_component?.execute).toBeDefined();
  expect(set.list_peers?.execute).toBeUndefined();
  expect(set.cc_add?.execute).toBeUndefined();
});

// The model only ever sees `inputSchema`, so a Zod-declared input is worth
// nothing until it survives the generation: ask_user's two-to-four options were
// prose in the description and a rule in the validator, and nowhere the model
// could read them.
interface JsonNode {
  type?: string;
  description?: string;
  enum?: string[];
  minItems?: number;
  maxItems?: number;
  items?: JsonNode;
  properties?: Record<string, JsonNode>;
  required?: string[];
}

test("a Zod-declared input reaches the model as JSON Schema, constraints and descriptions intact", () => {
  const schema = TOOLS.ask_user!.inputSchema as unknown as JsonNode;
  const props = schema.properties!;

  expect(props.options!.minItems).toBe(2);
  expect(props.options!.maxItems).toBe(4);
  expect(props.options!.description).toContain("Two to four distinct answers.");
  expect(props.question!.description).toBe("The question, as one short line.");
  expect(props.type!.enum).toEqual(["single_select", "multi_select"]);
  expect(props.options!.items!.properties!.label!.description).toBe("What the user reads and taps.");
  expect(props.options!.items!.required).toEqual(["label"]);
  expect(schema.required).toEqual(["question", "type", "options"]);
});

// An action in the enum with no property to carry its argument is a call the
// model can make and cannot express: `rename` lost its `name` once, leaving the
// dashboard's handler reading an input the schema never offered.
test("every cc_node action has the input property it needs", () => {
  const schema = TOOLS.cc_node!.inputSchema as unknown as JsonNode;
  const props = schema.properties!;

  // null where the action needs nothing beyond `node`; a new action has to be
  // classified here rather than quietly slipping through.
  const companion: Record<string, string | null> = {
    rename: "name",
    add_to_group: "group",
    route_network: "network",
    move: "position",
    remove: null,
    delete: null,
    enable: null,
    disable: null,
    focus: null,
    unfocus: null,
    details: null,
  };

  for (const action of props.action!.enum!) {
    expect(Object.keys(companion)).toContain(action);
    const needed = companion[action];
    if (needed) expect(props[needed]!.type).toBeTruthy();
  }
  expect(props.name!.description).toBe("rename only: the new name.");
});

// The description is a promise about the schema: it lists the fields by name,
// and the naming rules in skills/control-center.md depend on `name` existing.
test("cc_policy accepts every field its description promises", () => {
  const def = TOOLS.cc_policy!;
  const props = (def.inputSchema as unknown as JsonNode).properties!;

  for (const field of ["name", "description", "enabled", "protocol", "ports", "bidirectional"]) {
    expect(props[field]).toBeDefined();
  }
  expect(props.name!.type).toBe("string");
  expect(def.description).toContain("a real name");
});

// `$schema` is meta about the document, not about the input, and every byte of
// a tool spec is prompt.
test("no tool ships a $schema key to the model", () => {
  for (const def of Object.values(TOOLS)) expect("$schema" in def.inputSchema).toBe(false);
});

const GATE_OPEN: ModelMessage[] = [
  { role: "user", content: "which env?" },
  { role: "assistant", content: [{ type: "tool-call", toolCallId: "t1", toolName: "list_peers", input: {} }] },
];

test("a Zod-backed tool rejects bad input uniformly, naming the fields and the way out", async () => {
  const rejected = await runServerTool(
    "ask_user",
    { question: "Which?", type: "single_select", options: [{ label: "Only one" }] },
    { messages: GATE_OPEN },
  );
  expect(rejected.ok).toBe(false);
  expect(rejected.content).toStartWith("Invalid input for ask_user: options — ");
  expect(rejected.content).toEndWith("Fix the fields and call ask_user again, or just ask in Markdown.");
  expect(rejected.summary).toBe("ask_user input rejected");

  // No invalidHint: the sentence just ends.
  const noHint = await runServerTool("search_docs", { query: "" });
  expect(noHint.ok).toBe(false);
  expect(noHint.content).toEndWith("Fix the fields and call search_docs again.");
});

test("a Zod-backed tool's execute is handed the parsed input, not the raw call", async () => {
  const def = TOOLS.ask_user!;
  if (def.runtime !== "server") throw new Error("ask_user must be a server tool");

  const original = def.execute;
  let seen: unknown;
  def.execute = (input) => {
    seen = input;
    return { ok: true, content: "", summary: "" };
  };
  try {
    await runServerTool(
      "ask_user",
      {
        question: "Which environment?",
        type: "single_select",
        options: [{ label: "Production", weight: 3 }, { label: "Staging" }],
        stray: "drop me",
      },
      { messages: GATE_OPEN },
    );
  } finally {
    def.execute = original;
  }

  expect(seen).toEqual({
    question: "Which environment?",
    type: "single_select",
    options: [{ label: "Production" }, { label: "Staging" }],
  });
});
