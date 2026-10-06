import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { APIAgentNetworkAccessLog } from "@/modules/agent-network/agentAccessLogApi";

let logs: APIAgentNetworkAccessLog[] = [];
const mutate = vi.fn();
const reads: { url: string; revalidate: boolean; allowFetch: boolean }[] = [];

vi.mock("@utils/api", () => ({
  default: (
    url: string,
    _ignoreError: boolean,
    revalidate: boolean,
    allowFetch: boolean,
  ) => {
    reads.push({ url, revalidate, allowFetch });
    // SWR fetches nothing for a read that is not allowed.
    return { data: allowFetch ? { data: logs } : undefined, mutate };
  },
}));

vi.mock("@/modules/agent-network/AIProvidersProvider", () => ({
  useAIProviders: () => ({
    providers: [
      { id: "prov1", providerId: "anthropic_api", name: "Anthropic" },
    ],
  }),
}));

const { OnboardingAgentEnd } = await import(
  "@/modules/onboarding/agent-network/OnboardingAgentEnd"
);

const NOW = new Date("2026-10-01T12:00:00Z");
const USER_ID = "user-maya";

const entry = (
  overrides: Partial<APIAgentNetworkAccessLog> = {},
): APIAgentNetworkAccessLog => ({
  id: "log1",
  service_id: "svc1",
  timestamp: "2026-10-01T11:59:30Z",
  status_code: 200,
  duration_ms: 420,
  input_tokens: 234,
  output_tokens: 1000,
  total_tokens: 1234,
  cost_usd: 0.01,
  model: "claude-sonnet-5",
  resolved_provider_id: "prov1",
  decision: "allow",
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  logs = [];
  mutate.mockReset();
  reads.length = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// renderEnd renders the step for the given operator; the returned rerender
// renders it again from a new element, so React does not skip it.
const renderEnd = (userId?: string) => {
  const props = { onBack: vi.fn(), onFinish: vi.fn() };
  const element = (id?: string) => (
    <OnboardingAgentEnd deviceName={"maya-laptop"} userId={id} {...props} />
  );
  const view = render(element(userId));
  return {
    ...props,
    rerender: (id = userId) => view.rerender(element(id)),
  };
};

const buttons = () =>
  screen.getAllByRole("button").map((b) => b.textContent?.trim());

// expectLearnMore checks that a failed request points at the Access Logs, which
// ends the onboarding, and at the docs in a new tab.
const expectLearnMore = (callout: HTMLElement, onFinish: () => void) => {
  const docs = within(callout).getByRole("link", { name: "docs" });
  expect(docs.getAttribute("href")).toBe(
    "https://docs.netbird.io/agent-network/quickstart",
  );
  expect(docs.getAttribute("target")).toBe("_blank");

  fireEvent.click(within(callout).getByRole("button", { name: "Access Logs" }));
  expect(onFinish).toHaveBeenCalledTimes(1);
};

// waitPolls lets the step's timer run for the given time.
const waitPolls = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("OnboardingAgentEnd", () => {
  it("asks for a test request from the device and waits for it", () => {
    const { onBack, onFinish } = renderEnd(USER_ID);

    expect(screen.getByRole("heading").textContent).toBe("Send a test request");
    expect(screen.getByText("maya-laptop")).toBeTruthy();
    expect(screen.getByText("Waiting for your first request")).toBeTruthy();
    expect(
      screen.queryByTestId("agent-network-sections"),
      "the sections wait for a passed request",
    ).toBeNull();
    expect(buttons(), "back to the config, or skip the test").toEqual([
      "Go Back",
      "Skip",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("reads the operator's newest request since shortly before the step opened, every few seconds", () => {
    const { rerender } = renderEnd(USER_ID);

    const url = new URL(reads[0].url, "https://api.example");
    expect(url.pathname).toBe("/agent-network/access-logs");
    expect(url.searchParams.get("page_size")).toBe("1");
    expect(
      url.searchParams.get("user_id"),
      "another user's request is not the test",
    ).toBe(USER_ID);
    expect(
      url.searchParams.get("start_date"),
      "a request sent from the previous step still counts",
    ).toBe("2026-10-01T11:45:00.000Z");
    expect(reads[0].revalidate, "the timer drives the reads").toBe(false);

    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(1);
    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(2);
    rerender();
    expect(
      new Set(reads.map((r) => r.url)).size,
      "the window does not move with each render",
    ).toBe(1);
  });

  it("reads nothing until it knows the operator", () => {
    // Without a user id the read would be unfiltered, and any user's request
    // on the account would pass the test.
    logs = [entry()];
    const { rerender } = renderEnd();

    expect(
      reads.filter((r) => r.allowFetch),
      "no read before the operator is known",
    ).toEqual([]);
    expect(screen.getByText("Waiting for your first request")).toBeTruthy();
    waitPolls(3000);
    expect(mutate, "nothing to poll yet").not.toHaveBeenCalled();

    rerender(USER_ID);
    const read = reads[reads.length - 1];
    expect(read.allowFetch, "reads once the operator is known").toBe(true);
    expect(
      new URL(read.url, "https://api.example").searchParams.get("user_id"),
    ).toBe(USER_ID);
  });

  it("ends on what the dashboard offers once a request passes, and stops watching", () => {
    logs = [entry()];
    const { onFinish } = renderEnd(USER_ID);

    expect(screen.getByRole("heading").textContent).toBe("You're all set!");
    expect(screen.getByTestId("agent-network-test-passed").textContent).toBe(
      "Your request reached Anthropic and used 1,234 tokens.",
    );
    const sections = within(screen.getByTestId("agent-network-sections"));
    const titles = [
      "Providers",
      "Policies",
      "Guardrails",
      "Budgets and limits",
      "Usage",
      "Access Logs",
      "Log retention",
      "Agent setup",
    ];
    expect(
      sections
        .getAllByRole("listitem")
        .map((item) => item.querySelector("div > div")?.textContent),
      "one line per Agent Network section",
    ).toEqual(titles);
    expect(buttons()).toEqual(["Go Back", "Finish"]);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledTimes(1);

    waitPolls(10_000);
    expect(mutate, "a passed request stays on screen").not.toHaveBeenCalled();
  });

  it("reports a denied request and keeps watching", () => {
    logs = [
      entry({
        decision: "deny",
        deny_reason: "model_not_routable",
        model: "gpt-4",
        status_code: 403,
      }),
    ];
    const { onFinish } = renderEnd(USER_ID);

    const callout = screen.getByTestId("agent-network-test-denied");
    expect(
      within(callout).getByText(
        "Your last request, for gpt-4, was denied: Model not available.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Waiting for your next request")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Skip" })).toBeTruthy();

    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(1);
    expectLearnMore(callout, onFinish);
  });

  it("reports a request the provider answered with an error and keeps watching", () => {
    logs = [entry({ status_code: 401, total_tokens: 0 })];
    const { onFinish } = renderEnd(USER_ID);

    const callout = screen.getByTestId("agent-network-test-failed");
    expect(
      within(callout).getByText(
        "Your last request, for claude-sonnet-5, reached the provider and came back with status 401.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("heading").textContent).toBe("Send a test request");

    waitPolls(3000);
    expect(mutate).toHaveBeenCalledTimes(1);
    expectLearnMore(callout, onFinish);
  });
});
