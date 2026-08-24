import { beforeEach, expect, test } from "bun:test";
import { analyzeText, PiiVault, resetPiiCacheForTests } from "@/lib/pii.ts";
import { setEnv } from "./env.ts";

/*
  Integration tests against a REAL Presidio analyzer — the one thing the unit
  tests can't cover, since they mock the HTTP contract. Skipped when no
  analyzer is reachable (CI without the sidecar), so they gate nothing; run
  them locally with: docker compose -f docker/docker-compose.yml up -d presidio
*/

const url = process.env.PRESIDIO_URL ?? "http://localhost:5002";

const reachable = await (async () => {
  try {
    const res = await fetch(`${url}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "ping", language: "en" }),
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
})();

beforeEach(() => {
  setEnv({ PRESIDIO_URL: url });
  resetPiiCacheForTests();
});

test.skipIf(!reachable)(
  "the analyzer's wire contract matches what pii.ts expects",
  async () => {
    const text = "my name is Milo Kern and I live in Berlin";
    const findings = await analyzeText(text);

    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(typeof f.entity_type).toBe("string");
      expect(typeof f.start).toBe("number");
      expect(typeof f.end).toBe("number");
      expect(typeof f.score).toBe("number");
    }
    const person = findings.find((f) => f.entity_type === "PERSON");
    expect(person).toBeDefined();
    expect(text.slice(person!.start, person!.end)).toBe("Milo Kern");
  },
);

test.skipIf(!reachable)(
  "a real detection round-trips through the vault",
  async () => {
    const vault = new PiiVault();
    const scrubbed = await vault.scrubText("add Milo Kern's laptop to Berlin");

    expect(scrubbed).not.toContain("Milo Kern");
    expect(scrubbed).toContain("[REDACTED_PERSON_1]");
    expect(vault.restoreText(scrubbed)).toBe("add Milo Kern's laptop to Berlin");
  },
);

test.skipIf(!reachable)(
  "structural values our own patterns already cover are also seen by the analyzer",
  async () => {
    const text = "reach me at eduard@netbird.io";
    const findings = await analyzeText(text);
    const email = findings.find((f) => f.entity_type === "EMAIL_ADDRESS");
    expect(email).toBeDefined();
    expect(text.slice(email!.start, email!.end)).toBe("eduard@netbird.io");
  },
);
