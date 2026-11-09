import { describe, expect, it } from "vitest";
import type { APIAgentNetworkAccessLog } from "@/modules/agent-network/agentAccessLogApi";
import {
  testRequestLogUrl,
  testRequestOutcome,
} from "@/modules/onboarding/agent-network/testRequest";

const entry = (
  overrides: Partial<APIAgentNetworkAccessLog> = {},
): APIAgentNetworkAccessLog => ({
  id: "log1",
  service_id: "svc1",
  timestamp: "2026-10-01T12:00:00Z",
  status_code: 200,
  duration_ms: 420,
  input_tokens: 12,
  output_tokens: 30,
  total_tokens: 42,
  cost_usd: 0.001,
  decision: "allow",
  ...overrides,
});

describe("testRequestOutcome", () => {
  it("waits until a request is logged", () => {
    expect(testRequestOutcome(undefined).kind).toBe("waiting");
  });

  it("passes a request the provider answered", () => {
    expect(testRequestOutcome(entry()).kind).toBe("passed");
    expect(
      testRequestOutcome(entry({ status_code: 399 })).kind,
      "anything below 400 is an answer",
    ).toBe("passed");
  });

  it("reports a denied request, whatever its status", () => {
    expect(
      testRequestOutcome(
        entry({
          decision: "deny",
          deny_reason: "model_not_routable",
          status_code: 200,
        }),
      ).kind,
    ).toBe("denied");
  });

  it("reports an allowed request the provider answered with an error", () => {
    expect(testRequestOutcome(entry({ status_code: 400 })).kind).toBe("failed");
    expect(testRequestOutcome(entry({ status_code: 502 })).kind).toBe("failed");
  });
});

describe("testRequestLogUrl", () => {
  it("asks for the user's newest request since the given time", () => {
    const url = new URL(
      testRequestLogUrl(new Date("2026-10-01T11:45:00Z"), "user-maya"),
      "https://api.example",
    );
    expect(url.pathname).toBe("/agent-network/access-logs");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "1",
      page_size: "1",
      start_date: "2026-10-01T11:45:00.000Z",
      user_id: "user-maya",
    });
  });
});
