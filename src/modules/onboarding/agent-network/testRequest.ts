import type { APIAgentNetworkAccessLog } from "@/modules/agent-network/agentAccessLogApi";

// How often the test step reads the access log while it waits.
export const TEST_REQUEST_POLL_MS = 3000;
// How far back a logged request still counts as the test: one sent from the
// Configure step just before the operator moved on is the test too.
export const TEST_REQUEST_LOOKBACK_MS = 15 * 60 * 1000;

export type TestRequestOutcome =
  | { kind: "waiting" }
  // A policy or guardrail turned the request away.
  | { kind: "denied"; entry: APIAgentNetworkAccessLog }
  // Allowed through, but the provider answered with an error.
  | { kind: "failed"; entry: APIAgentNetworkAccessLog }
  | { kind: "passed"; entry: APIAgentNetworkAccessLog };

// testRequestOutcome reads the latest logged request. Only a request the
// provider answered without an error passes; the others say what went wrong
// so the operator can fix it and send another.
export function testRequestOutcome(
  entry?: APIAgentNetworkAccessLog,
): TestRequestOutcome {
  if (!entry) return { kind: "waiting" };
  if (entry.decision === "deny") return { kind: "denied", entry };
  if (entry.status_code >= 400) return { kind: "failed", entry };
  return { kind: "passed", entry };
}

// testRequestLogUrl lists the newest request the user sent since the given
// time.
export function testRequestLogUrl(since: Date, userId: string): string {
  const params = new URLSearchParams({
    page: "1",
    page_size: "1",
    start_date: since.toISOString(),
    user_id: userId,
  });
  return `/agent-network/access-logs?${params}`;
}
