import { test, expect } from "bun:test";
import { setEnv } from "./env.ts";
import { providerFor } from "@/llm/registry.ts";

setEnv();

test("providerFor resolves each tier to its configured model", () => {
  expect(providerFor("main").model).toBe("claude-sonnet-5");
  expect(providerFor("fast").model).toBe("claude-haiku-4-5");
});
