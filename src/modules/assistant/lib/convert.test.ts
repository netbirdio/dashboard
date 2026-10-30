import type { EveMessage } from "eve/react";
import { describe, expect, test } from "vitest";
import { restoreEveMessage } from "./convert";
import { Vault } from "./vault";

const message = (role: "user" | "assistant", text: string) =>
  ({ id: "m1", role, parts: [{ type: "text", text }] }) as EveMessage;

const textOf = (m: EveMessage) => (m.parts[0] as { text: string }).text;

describe("restoreEveMessage", () => {
  test("the person's own message reads as typed, with no markdown escapes", () => {
    const vault = new Vault();
    const scrubbed = vault.scrub("okay. 10.10.2.23");
    expect(textOf(restoreEveMessage(vault, message("user", scrubbed)))).toBe("okay. 10.10.2.23");
  });

  test("the model's answer restores a value as literal markdown", () => {
    const vault = new Vault();
    const scrubbed = vault.scrub("The printer is at 10.10.2.23.");
    expect(textOf(restoreEveMessage(vault, message("assistant", scrubbed)))).toBe(
      String.raw`The printer is at 10\.10\.2\.23.`,
    );
  });
});
