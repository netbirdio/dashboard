import { describe, expect, it } from "vitest";
import { accessLogFromAgentAPI } from "@/modules/agent-network/agentAccessLogApi";
import {
  AgentBudgetRule,
  AgentPolicy,
  formatErrorReason,
  MOCK_ERROR_ACCESS_LOGS,
  resolveBlockedBy,
  sessionReasonEntry,
} from "@/modules/agent-network/data/mockData";

const [policyDeny, limitDeny, providerError, proxyError, authError] =
  MOCK_ERROR_ACCESS_LOGS.map((e) => accessLogFromAgentAPI(e, new Map()));

const policies = [
  { id: "anpol-contractors", name: "Contractors → Gateway" },
] as AgentPolicy[];
const budgetRules = [
  { id: "anb-contractors", name: "Contractor daily tokens" },
] as AgentBudgetRule[];

describe("accessLogFromAgentAPI", () => {
  it("maps the error attribution fields", () => {
    expect(policyDeny).toMatchObject({
      errorSource: "policy",
      blockedBy: "anpol-contractors",
      errorDetail: expect.stringContaining("user budget cap exhausted"),
    });
  });

  it("leaves them undefined for an older server", () => {
    const { error_source, blocked_by, error_detail, ...old } =
      MOCK_ERROR_ACCESS_LOGS[0];
    const entry = accessLogFromAgentAPI(old, new Map());
    expect(entry.errorSource).toBeUndefined();
    expect(entry.blockedBy).toBeUndefined();
    expect(entry.errorDetail).toBeUndefined();
    expect(formatErrorReason(entry)).toBeUndefined();
  });

  it("drops an unknown error source but keeps the detail", () => {
    const entry = accessLogFromAgentAPI(
      {
        ...MOCK_ERROR_ACCESS_LOGS[3],
        error_source: "something_new" as never,
      },
      new Map(),
    );
    expect(entry.errorSource).toBeUndefined();
    expect(entry.errorDetail).toBe(MOCK_ERROR_ACCESS_LOGS[3].error_detail);
    expect(formatErrorReason(entry)).toBeUndefined();
  });

  it("does not take inherited object keys for an error source", () => {
    const entry = accessLogFromAgentAPI(
      { ...MOCK_ERROR_ACCESS_LOGS[3], error_source: "toString" as never },
      new Map(),
    );
    expect(entry.errorSource).toBeUndefined();
  });
});

describe("formatErrorReason", () => {
  it("labels each error source", () => {
    expect(formatErrorReason(policyDeny)).toBe("Budget limit exceeded");
    expect(formatErrorReason(limitDeny)).toBe("Account token limit exceeded");
    expect(formatErrorReason(providerError)).toBe("Provider error (401)");
    expect(formatErrorReason(proxyError)).toBe(
      "Proxy error: Destination Not Allowed",
    );
    expect(formatErrorReason({ ...proxyError, errorDetail: undefined })).toBe(
      "Proxy error",
    );
    expect(formatErrorReason(authError)).toBe("Authentication");
  });

  it("ignores the source on a successful row", () => {
    expect(
      formatErrorReason({ ...providerError, status: 200 }),
    ).toBeUndefined();
  });
});

describe("resolveBlockedBy", () => {
  it("resolves a policy by id", () => {
    expect(resolveBlockedBy(policyDeny, policies, budgetRules)).toEqual({
      kind: "policy",
      id: "anpol-contractors",
      name: "Contractors → Gateway",
      href: "/agent-network/policies?search=Contractors%20%E2%86%92%20Gateway",
    });
  });

  it("resolves a global limit for an llm_account deny", () => {
    expect(resolveBlockedBy(limitDeny, policies, budgetRules)).toMatchObject({
      kind: "global_limit",
      name: "Contractor daily tokens",
      href: "/agent-network/configuration?tab=budget-settings",
    });
  });

  it("falls back to the id when the target was deleted", () => {
    expect(resolveBlockedBy(policyDeny, [], [])?.name).toBe(
      "anpol-contractors",
    );
    expect(resolveBlockedBy(limitDeny, undefined, undefined)?.name).toBe(
      "anb-contractors",
    );
  });

  it("is undefined without blocked_by", () => {
    expect(resolveBlockedBy(providerError, policies, budgetRules)).toBe(
      undefined,
    );
  });
});

describe("sessionReasonEntry", () => {
  const ok = { ...providerError, id: "ok", status: 200 };

  it("prefers a successful allowed request over an earlier failed one", () => {
    expect(sessionReasonEntry([providerError, ok])).toBe(ok);
  });

  it("falls back to a failed allowed request over a deny", () => {
    expect(sessionReasonEntry([policyDeny, providerError])).toBe(providerError);
  });

  it("falls back to the first entry when every request was denied", () => {
    expect(sessionReasonEntry([policyDeny, limitDeny])).toBe(policyDeny);
    expect(sessionReasonEntry([])).toBeUndefined();
  });
});
