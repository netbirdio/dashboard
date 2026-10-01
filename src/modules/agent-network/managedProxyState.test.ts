import { describe, expect, it } from "vitest";
import {
  managedProxyPollInterval,
  provisionOutcome,
} from "@/modules/agent-network/managedProxyState";

const deployment = {
  id: "d1m3kebd9pcs0c1pnu7g",
  state: "provisioning",
  endpoint: "brave-otter.gateway.netbird.io",
};

describe("managedProxyPollInterval", () => {
  it("does not poll without a deployment", () => {
    expect(managedProxyPollInterval(undefined)).toBe(0);
  });

  it("polls every 3 seconds while provisioning", () => {
    expect(managedProxyPollInterval({ state: "provisioning" })).toBe(3_000);
  });

  it("stops once ready", () => {
    expect(managedProxyPollInterval({ state: "ready" })).toBe(0);
  });

  it("keeps a slow poll while failed, since failed can clear on its own", () => {
    expect(managedProxyPollInterval({ state: "failed" })).toBe(15_000);
  });

  it("keeps a slow poll for a state this dashboard does not know", () => {
    expect(managedProxyPollInterval({ state: "terminating" })).toBe(15_000);
  });
});

describe("provisionOutcome", () => {
  it("reports the deployment on a 202 (started) and a 200 (already exists)", () => {
    expect(provisionOutcome({ code: 202, body: deployment })).toEqual({
      kind: "deployment",
      proxy: deployment,
    });
    const ready = { ...deployment, state: "ready" };
    expect(provisionOutcome({ code: 200, body: ready })).toEqual({
      kind: "deployment",
      proxy: ready,
    });
  });

  it("keeps an unknown state as a deployment rather than an error", () => {
    const body = { ...deployment, state: "disabled", extra: true };
    expect(provisionOutcome({ code: 200, body }).kind).toBe("deployment");
  });

  it("treats a success without a usable deployment body as an error", () => {
    expect(
      provisionOutcome({ code: 200, body: { id: "x", state: "ready" } }).kind,
    ).toBe("error");
  });

  it("names the account's existing endpoint on a 409", () => {
    // The 409 body is the conflict shape, with no code field of its own.
    expect(
      provisionOutcome({ code: 409, body: { endpoint: "llm.example.com" } }),
    ).toEqual({ kind: "conflict", endpoint: "llm.example.com" });
  });

  it("treats a 409 without an endpoint as an error", () => {
    expect(provisionOutcome({ code: 409, body: {} }).kind).toBe("error");
  });

  it("reports 412 and 503 as temporarily unavailable", () => {
    expect(
      provisionOutcome({
        code: 412,
        body: { code: 412, message: "no proxy-manager cluster registered" },
      }),
    ).toEqual({ kind: "unavailable" });
    // The 503 body is an ErrorResponse with a message and no code.
    expect(
      provisionOutcome({ code: 503, body: { message: "exhausted" } }),
    ).toEqual({ kind: "unavailable" });
  });

  it("reports a 404 as no provisioner, whatever the body", () => {
    // An unregistered route answers with a plain-text body, parsed as none.
    expect(provisionOutcome({ code: 404, body: undefined })).toEqual({
      kind: "not-configured",
    });
  });

  it("reports a 403 as missing permission", () => {
    expect(
      provisionOutcome({
        code: 403,
        body: { code: 403, message: "permission denied" },
      }),
    ).toEqual({ kind: "forbidden" });
  });

  it("carries the server message for any other failure", () => {
    expect(
      provisionOutcome({
        code: 500,
        body: { code: 500, message: "internal server error" },
      }),
    ).toEqual({ kind: "error", message: "internal server error" });
    expect(provisionOutcome({ code: 500, body: undefined })).toEqual({
      kind: "error",
      message: "Request failed with status code 500",
    });
  });
});
