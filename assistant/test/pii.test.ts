import { test, expect } from "bun:test";
import {
  createPiiVault,
  createRestoreStream,
  scrubTranscript,
} from "@/guardrails/pii.ts";
import type { LlmMessage } from "@/types.ts";

test("scrub replaces emails, IPv4, IPv6 and CIDR with reversible tokens", () => {
  const v = createPiiVault();
  expect(v.scrub("mail me at ann@acme.io")).toBe("mail me at {REDACTED_EMAIL_1}");
  expect(v.scrub("peer at 100.64.0.7 is down")).toBe("peer at {REDACTED_IP_1} is down");
  expect(v.scrub("route 10.0.0.0/24 via gw")).toBe("route {REDACTED_CIDR_1} via gw");
  expect(v.scrub("v6 2001:db8:85a3:0:0:8a2e:370:7334 here")).toBe("v6 {REDACTED_IP_2} here");
});

test("the same value always gets the same token", () => {
  const v = createPiiVault();
  const first = v.scrub("from 10.0.0.5 to 10.0.0.9");
  expect(first).toBe("from {REDACTED_IP_1} to {REDACTED_IP_2}");
  expect(v.scrub("10.0.0.5 again")).toBe("{REDACTED_IP_1} again");
  expect(v.size).toBe(2);
});

test("restore puts the real values back, and leaves foreign tokens alone", () => {
  const v = createPiiVault();
  v.scrub("check 192.168.1.5 and ann@acme.io");
  expect(v.restore("{REDACTED_IP_1} is up; mailed {REDACTED_EMAIL_1}")).toBe(
    "192.168.1.5 is up; mailed ann@acme.io",
  );
  // The frontend's own placeholders, and anything the model invented, survive.
  expect(v.restore("{PEER_1} at {IP_1} — {REDACTED_IP_9}")).toBe(
    "{PEER_1} at {IP_1} — {REDACTED_IP_9}",
  );
});

test("restore is a no-op for a vault that scrubbed nothing", () => {
  const v = createPiiVault();
  expect(v.restore("{REDACTED_IP_1}")).toBe("{REDACTED_IP_1}");
});

test("scrub is conservative: normal text and doc URLs survive", () => {
  const v = createPiiVault();
  const url = "See https://docs.netbird.io/manage/dns/nameserver-groups for setup.";
  expect(v.scrub(url)).toBe(url);
  expect(v.scrub("version 0.28.1 on peer_3")).toBe("version 0.28.1 on peer_3");
  expect(v.scrub("run step a:b:c then done")).toBe("run step a:b:c then done");
  expect(v.size).toBe(0);
});

test("scrub cannot catch resource names (documents the limitation)", () => {
  const v = createPiiVault();
  // A peer named 'prod-db-1' has nothing structural to match — frontend's job.
  expect(v.scrub("why can't prod-db-1 reach the office?")).toBe(
    "why can't prod-db-1 reach the office?",
  );
});

test("scrubTranscript covers user text, tool results, assistant text and tool inputs", () => {
  const v = createPiiVault();
  const messages: LlmMessage[] = [
    { role: "user", content: "check 192.168.1.5" },
    {
      role: "assistant",
      content: [
        { type: "text", text: "the admin is admin@x.io" },
        { type: "tool_use", id: "t1", name: "cc_add", input: { items: [{ address: "10.1.1.0/24" }] } },
      ],
    },
    { role: "user", content: [{ type: "tool_result", toolUseId: "t1", content: "peer ip 10.1.1.1" }] },
  ];

  const out = scrubTranscript(messages, v);

  expect(out[0]!.content).toBe("check {REDACTED_IP_1}");
  // Assistant turns are scrubbed too: real values were restored on the way out
  // last turn, so they come back in the transcript.
  const assistant = out[1]!.content as any[];
  expect(assistant[0].text).toBe("the admin is {REDACTED_EMAIL_1}");
  expect(assistant[1].input.items[0].address).toBe("{REDACTED_CIDR_1}");
  expect((out[2]!.content as any[])[0].content).toBe("peer ip {REDACTED_IP_2}");
});

test("restoreDeep walks a payload but never rewrites a thinking block", () => {
  const v = createPiiVault();
  v.scrub("192.168.1.5");
  const thinking = { type: "thinking", thinking: "about {REDACTED_IP_1}", signature: "sig" };

  const restored = v.restoreDeep({
    content: [{ type: "text", text: "it is {REDACTED_IP_1}" }, thinking],
  }) as any;

  expect(restored.content[0].text).toBe("it is 192.168.1.5");
  // Altering thinking text would invalidate its signature for the next turn.
  expect(restored.content[1].thinking).toBe("about {REDACTED_IP_1}");
});

test("a token split across two deltas is held back, not half-emitted", () => {
  const v = createPiiVault();
  v.scrub("100.64.0.7");
  const stream = createRestoreStream(v);

  expect(stream.push("the ip is {REDAC")).toBe("the ip is ");
  expect(stream.push("TED_IP_1} now")).toBe("100.64.0.7 now");
  expect(stream.flush()).toBe("");
});

test("an unclosed brace is released on flush rather than swallowed", () => {
  const v = createPiiVault();
  v.scrub("100.64.0.7");
  const stream = createRestoreStream(v);

  expect(stream.push("a json object {")).toBe("a json object ");
  expect(stream.flush()).toBe("{");
});

test("a long brace run is not held forever", () => {
  const v = createPiiVault();
  v.scrub("100.64.0.7");
  const stream = createRestoreStream(v);

  // Longer than any token this module mints — emitted instead of buffered.
  const long = "{" + "A".repeat(40);
  expect(stream.push(long)).toBe(long);
});
