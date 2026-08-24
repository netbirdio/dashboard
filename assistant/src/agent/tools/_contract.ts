// The tool contract. A leaf module on purpose: every tool file imports
// defineTool from here and the registry imports every tool file, so anything
// they share has to sit below both or the cycle deadlocks at import time.
// The `_` prefix keeps it out of tool discovery (see registry.ts).
import type { ModelMessage } from "ai";
import { z } from "zod";

export type ToolRuntime = "client" | "server";

export interface ServerToolResult {
  ok: boolean;
  content: string;
  summary: string;
  // fetch_doc only: what the dashboard shows in the source list.
  source?: { url: string; title: string; domain: string };
}

// Server tools see the turn so far; ask_user gates on it.
export interface ToolContext {
  messages: ModelMessage[];
}

type Execute<Input> = (
  input: Input,
  ctx: ToolContext,
) => ServerToolResult | Promise<ServerToolResult>;

type Variant<Input> =
  | { runtime: "client" }
  | {
      runtime: "server";
      execute: Execute<Input>;
      // Results are public and identical for every account, so they can be
      // shared across callers.
      cache?: boolean;
    };

interface Common {
  description: string;
  // Appended to the registry's uniform rejection: the escape hatch this
  // particular tool can offer a model that keeps failing validation.
  invalidHint?: string;
}

// Readonly because the shared schemas in _schemas.ts are frozen singletons
// handed to a dozen tools each.
type JsonSchema = Readonly<Record<string, unknown>>;

// A tool's name is its filename, so it is deliberately absent here.
export type ToolDefinition = Common & {
  inputSchema: JsonSchema;
  // Set when the tool declared its input as Zod: the registry validates
  // against it and hands `execute` the parsed value.
  input?: z.ZodType;
} & Variant<unknown>;

// Declare the input once, as Zod: the model-facing JSON Schema is generated
// from it and `execute` gets the parsed, typed value. `inputSchema` may still
// be passed alongside for a tool whose model-facing shape is deliberately not
// the validation shape.
type ZodSpec<S extends z.ZodType> = Common & {
  input: S;
  inputSchema?: JsonSchema;
} & Variant<z.output<S>>;

// Declare the input as hand-written JSON Schema, and validate it yourself.
type JsonSpec = Common & { inputSchema: JsonSchema } & Variant<unknown>;

export function defineTool<S extends z.ZodType>(tool: ZodSpec<S>): ToolDefinition;
export function defineTool(tool: JsonSpec): ToolDefinition;
export function defineTool(tool: ZodSpec<z.ZodType> | JsonSpec): ToolDefinition {
  const input = "input" in tool ? tool.input : undefined;
  const inputSchema = tool.inputSchema ?? modelSchema(input!);
  // The only cast in the layer: `execute` is typed against the tool's own
  // input, and the registry can only ever hand it an `unknown` off the wire.
  return { ...tool, inputSchema } as ToolDefinition;
}

// Draft 7 is what the tool API takes, and `$schema` would only be prompt noise.
function modelSchema(schema: z.ZodType): JsonSchema {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema, { target: "draft-7", io: "input" });
  return rest;
}
