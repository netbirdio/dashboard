import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toKey } from "@/cloud/analytics/MatomoProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

const environment = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  cloud: true,
}));
vi.mock("@utils/config", () => ({ default: () => environment.config }));
vi.mock("@utils/netbird", () => ({ isNetBirdCloud: () => environment.cloud }));

const session = vi.hoisted(() => ({
  user: undefined as Record<string, unknown> | undefined,
  account: undefined as Record<string, unknown> | undefined,
  canReadAccounts: true,
  peers: undefined as { connected: boolean }[] | undefined,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/peers" }));
vi.mock("swr", () => ({ default: () => ({ data: session.peers }) }));
vi.mock("@/contexts/BillingProvider", () => ({ useBilling: () => ({}) }));
vi.mock("@/contexts/UsersProvider", () => ({
  useLoggedInUser: () => ({ loggedInUser: session.user }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({
    permission: { accounts: { read: session.canReadAccounts } },
  }),
}));
vi.mock("@/modules/account/useAccount", () => ({
  useAccount: () => session.account,
}));

type Matomo = typeof import("@/cloud/analytics/MatomoProvider");

const load = async (): Promise<Matomo> => {
  vi.resetModules();
  return import("@/cloud/analytics/MatomoProvider");
};
const start = async () => {
  const matomo = await load();
  matomo.initMatomo();
  window._paq = [];
  return matomo;
};

const sent = () => window._paq ?? [];
const names = () =>
  sent()
    .filter(([command]) => command === "trackEvent")
    .map(([, , , name]) => name);
const urls = () =>
  sent()
    .filter(([command]) => command === "setCustomUrl")
    .map(([, url]) => url);

const listeners: Parameters<typeof document.addEventListener>[] = [];
const addListener = document.addEventListener.bind(document);

beforeEach(() => {
  vi.spyOn(document, "addEventListener").mockImplementation((...args) => {
    listeners.push(args);
    addListener(...args);
  });
  environment.config = {
    matomoUrl: "https://netbird.matomo.cloud",
    matomoSiteId: "5",
  };
  environment.cloud = true;
  session.user = undefined;
  session.account = undefined;
  session.canReadAccounts = true;
  session.peers = undefined;
  window._paq = [];
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

afterEach(() => {
  listeners.splice(0).forEach((args) => document.removeEventListener(...args));
  document.documentElement.removeAttribute("data-matomo-modal");
  vi.restoreAllMocks();
});

const dialog = (tab?: string) => `
  <div role="dialog">
    <div role="tablist">
      <div role="tab" id="r-trigger-general" data-state="${
        tab === "general" ? "active" : "inactive"
      }"></div>
      <div role="tab" id="r-trigger-posture_checks" data-state="${
        tab === "posture_checks" ? "active" : "inactive"
      }"></div>
    </div>
  </div>`;
const inDialog = () => ({
  container: document
    .querySelector('[role="dialog"]')!
    .appendChild(document.createElement("div")),
});
const switchTab = (tab: string) =>
  document.querySelectorAll('[role="tab"]').forEach((element) => {
    const active = element.id.endsWith(`-trigger-${tab}`);
    element.setAttribute("data-state", active ? "active" : "inactive");
  });

describe("toKey", () => {
  it("turns names from the code into keys", () => {
    expect(toKey("Usage & Logs")).toBe("usage_logs");
    expect(toKey("Add Peer")).toBe("add_peer");
    expect(toKey("onboarding p2p 4")).toBe("onboarding_p2p_4");
    expect(toKey(undefined)).toBe("root");
  });

  it("never passes on what may be an email, a domain or an IP", () => {
    expect(toKey("jane@example.com")).toBe("invalid");
    expect(toKey("customer.example.com")).toBe("invalid");
    expect(toKey("100.64.0.1")).toBe("invalid");
  });
});

describe("setup", () => {
  it("starts without cookies, with the user ID before anything else", async () => {
    const { initMatomo, isHeatmapRecording } = await load();
    initMatomo("hashed-user");
    initMatomo("other-user");
    expect(sent()).toEqual([
      ["disableCookies"],
      ["FormAnalytics::disableFormAnalytics"],
      ["MediaAnalytics::disableMediaAnalytics"],
      ["setTrackerUrl", "https://netbird.matomo.cloud/matomo.php"],
      ["setSiteId", "5"],
      ["setUserId", "hashed-user"],
      ["enableHeartBeatTimer"],
      ["HeatmapSessionRecording::disable"],
      ["HeatmapSessionRecording::disableCaptureKeystrokes"],
      ["HeatmapSessionRecording::setTrigger", isHeatmapRecording],
      ["HeatmapSessionRecording::matchTrackerUrl"],
      ["setCustomUrl", `${window.location.origin}/`],
      ["setReferrerUrl", ""],
    ]);
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
    expect(document.head.querySelector("script")?.src).toBe(
      "https://cdn.matomo.cloud/netbird.matomo.cloud/matomo.js",
    );
  });

  it("lets heatmaps record and refuses session recordings", async () => {
    const { isHeatmapRecording } = await load();
    expect(isHeatmapRecording({ id: 1, sample_rate: 100, getdom: true })).toBe(
      true,
    );
    expect(
      isHeatmapRecording({
        id: 2,
        sample_rate: 100,
        min_time: 0,
        activity: true,
        keystrokes: false,
        conditionsMet: true,
      }),
    ).toBe(false);
    expect(isHeatmapRecording({ id: 3, conditionsMet: true })).toBe(false);
    expect(isHeatmapRecording(undefined)).toBe(false);
  });

  it("queues events from before the start", async () => {
    const matomo = await load();
    matomo.trackEvent("screen", "empty_state");
    expect(sent()).toEqual([]);
    matomo.initMatomo();
    expect(names()).toEqual(["screen_empty_state"]);
  });

  it("sends queued events with the path and the referrer's origin only", async () => {
    window.history.pushState({}, "", "/peers?search=jane");
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      `${window.location.origin}/peer?id=peer-1`,
    );
    const matomo = await load();
    matomo.trackEvent("screen", "onboarding");
    matomo.initMatomo();
    const commands = sent().map(([command]) => command);
    expect(commands.indexOf("setCustomUrl")).toBeLessThan(
      commands.indexOf("trackEvent"),
    );
    expect(commands.indexOf("setReferrerUrl")).toBeLessThan(
      commands.indexOf("trackEvent"),
    );
    expect(urls()).toEqual([`${window.location.origin}/peers`]);
    expect(sent()).toContainEqual(["setReferrerUrl", window.location.origin]);
    window.history.pushState({}, "", "/");
  });

  it("sends paths only, and only the origin of where a visit came from", async () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://login.netbird.io/callback?email=jane%40example.com",
    );
    const { trackPageView } = await start();
    const origin = window.location.origin;
    trackPageView("/peers");
    trackPageView("/groups");
    expect(sent()).toEqual([
      ["setReferrerUrl", "https://login.netbird.io"],
      ["setCustomUrl", `${origin}/peers`],
      ["setDocumentTitle", "/peers"],
      ["trackPageView"],
      ["setReferrerUrl", `${origin}/peers`],
      ["setCustomUrl", `${origin}/groups`],
      ["setDocumentTitle", "/groups"],
      ["trackPageView"],
    ]);
  });

  it("gives modals heatmap URLs once heatmaps are on", async () => {
    const matomo = await start();
    const origin = window.location.origin;
    matomo.trackPageView("/peers");
    document.body.innerHTML = dialog();
    render(<matomo.ModalInsights flow={"setup_key"} />, inDialog()).unmount();
    expect(urls()).toEqual([`${origin}/peers`]);
    matomo.enableHeatmaps();
    window._paq = [];
    document.body.innerHTML = dialog("general");
    render(<matomo.ModalInsights flow={"policy"} />, inDialog());
    expect(urls()).toEqual([`${origin}/peers/modal/policy/general`]);
  });
});

describe("heatmap snapshots", () => {
  it("adds the viewer styles and marks when a modal is shown", async () => {
    const matomo = await start();
    matomo.trackPageView("/access-control");
    matomo.enableHeatmaps();
    expect(document.head.querySelector("style")?.textContent).toContain(
      "html.matomoHsr",
    );
    const html = document.documentElement;
    expect(html.hasAttribute("data-matomo-modal")).toBe(false);
    document.body.innerHTML = dialog("general");
    const view = render(<matomo.ModalInsights flow={"policy"} />, inDialog());
    expect(html.hasAttribute("data-matomo-modal")).toBe(true);
    view.unmount();
    expect(html.hasAttribute("data-matomo-modal")).toBe(false);
  });

  it("sends queued heatmap data before a click or Escape changes the screen", async () => {
    const sendQueuedData = vi.fn();
    window.Matomo = {
      getAsyncTracker: () => "tracker",
      HeatmapSessionRecording: { tracking: { sendQueuedData } },
    };
    const matomo = await start();
    matomo.enableHeatmaps();
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true }),
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(sendQueuedData).toHaveBeenCalledTimes(2);
    expect(sendQueuedData).toHaveBeenCalledWith("tracker");
    delete window.Matomo;
  });
});

describe("without Matomo", () => {
  const exercise = async () => {
    const matomo = await load();
    document.body.innerHTML = dialog("general");
    const Screen = () => {
      matomo.useMatomoEvent("test_request", "passed");
      matomo.useMatomoVirtualPage("login_error");
      matomo.useMatomoHeatmap("onboarding", "p2p", 1);
      return <matomo.ModalInsights flow={"policy"} />;
    };
    const view = render(
      <>
        <matomo.MatomoProvider />
        <Screen />
      </>,
    );
    switchTab("posture_checks");
    matomo.initMatomo("user");
    matomo.sendMatomoEvent("Onboarding", "Finished Onboarding");
    view.unmount();
    return {
      sent: sent(),
      scripts: document.head.querySelectorAll("script").length,
    };
  };
  const nothing = { sent: [], scripts: 0 };

  it.each([
    ["no settings", {}],
    ["empty values", { matomoUrl: "", matomoSiteId: "" }],
    ["only a URL", { matomoUrl: "https://netbird.matomo.cloud" }],
    ["only a site ID", { matomoSiteId: "5" }],
  ])("does nothing with %s", async (_, config) => {
    environment.config = config;
    expect(await exercise()).toEqual(nothing);
  });

  it("does nothing on self-hosted, with or without settings", async () => {
    environment.cloud = false;
    expect(await exercise()).toEqual(nothing);
    environment.config = {};
    expect(await exercise()).toEqual(nothing);
  });
});

describe("modals", () => {
  it("reports the opening tab and every tab switched to", async () => {
    const matomo = await start();
    document.body.innerHTML = dialog("general");
    render(<matomo.ModalInsights flow={"policy"} />, inDialog());
    switchTab("posture_checks");
    await waitFor(() =>
      expect(names()).toEqual([
        "policy_modal_opened",
        "policy_tab_viewed_general",
        "policy_tab_viewed_posture_checks",
      ]),
    );
  });

  it("reads tabs from its own dialog, not the last one on the page", async () => {
    const matomo = await start();
    document.body.innerHTML = `${dialog(
      "posture_checks",
    )}<div role="dialog"></div>`;
    render(<matomo.ModalInsights flow={"policy"} />, inDialog());
    expect(names()).toEqual([
      "policy_modal_opened",
      "policy_tab_viewed_posture_checks",
    ]);
  });

  it("names the peer setup tabs after the operating system", async () => {
    const matomo = await start();
    document.body.innerHTML = `
      <div role="dialog">
        <div role="tablist">
          <div role="tab" id="r-trigger-${OperatingSystem.LINUX}" data-state="active"></div>
          <div role="tab" id="r-trigger-${OperatingSystem.APPLE}" data-state="inactive"></div>
        </div>
      </div>`;
    render(<matomo.ModalInsights flow={"peer_setup"} />, inDialog());
    switchTab(String(OperatingSystem.APPLE));
    await waitFor(() =>
      expect(names()).toEqual([
        "peer_setup_modal_opened",
        "peer_setup_tab_viewed_linux",
        "peer_setup_tab_viewed_apple",
      ]),
    );
  });

  it("reports a modal without tabs as opened only", async () => {
    const matomo = await start();
    render(<matomo.ModalInsights flow={"setup_key"} />).unmount();
    expect(names()).toEqual(["setup_key_modal_opened"]);
  });

  it("returns to the outer modal's heatmap URL when the inner one closes", async () => {
    const matomo = await start();
    matomo.trackPageView("/peers");
    matomo.enableHeatmaps();
    document.body.innerHTML = dialog("general");
    render(<matomo.ModalInsights flow={"policy"} />, inDialog());
    const inner = render(
      <matomo.ModalInsights flow={"posture_check"} />,
      inDialog(),
    );
    window._paq = [];
    inner.unmount();
    expect(urls()).toEqual([
      `${window.location.origin}/peers/modal/policy/general`,
    ]);
  });
});

describe("hooks", () => {
  it("sends an event per new name, and nothing without a name", async () => {
    const matomo = await start();
    const Screen = ({ outcome }: { outcome: string }) => {
      matomo.useMatomoEvent(outcome !== "waiting" && "test_request", outcome);
      return null;
    };
    const view = render(<Screen outcome="waiting" />);
    view.rerender(<Screen outcome="failed" />);
    view.rerender(<Screen outcome="failed" />);
    view.rerender(<Screen outcome="passed" />);
    view.unmount();
    expect(names()).toEqual([
      "screen_test_request_failed",
      "screen_test_request_passed",
    ]);
  });

  it("reports each step, the time spent on it, and going back", async () => {
    const matomo = await start();
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const Flow = ({ step }: { step: number }) => {
      matomo.useMatomoStep(step - 1, "onboarding", "p2p", step);
      return null;
    };
    const view = render(<Flow step={1} />);
    now.mockReturnValue(40_000);
    view.rerender(<Flow step={2} />);
    now.mockReturnValue(52_000);
    view.rerender(<Flow step={1} />);
    view.rerender(<Flow step={2} />);
    view.unmount();
    const values = sent()
      .filter(([command]) => command === "trackEvent")
      .map(([, , , name, value]) => [name, value]);
    expect(values).toEqual([
      ["screen_onboarding_p2p_1", undefined],
      ["screen_onboarding_p2p_1_time", 40],
      ["screen_onboarding_p2p_2", undefined],
      ["screen_onboarding_p2p_2_time", 12],
      ["screen_onboarding_p2p_1", undefined],
      ["screen_onboarding_p2p_1_back", undefined],
      ["screen_onboarding_p2p_2", undefined],
    ]);
  });

  it("marks a flow that opens past its first step as resumed", async () => {
    const matomo = await start();
    const Flow = () => {
      matomo.useMatomoStep(2, "onboarding", "networks", 3);
      return null;
    };
    render(<Flow />).unmount();
    expect(names()).toEqual([
      "screen_onboarding_networks_3",
      "screen_onboarding_networks_3_resumed",
    ]);
  });

  it("gives events the seconds since the step began", async () => {
    const matomo = await start();
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const Flow = ({ connected }: { connected: number }) => {
      matomo.useMatomoStep(0, "onboarding", "p2p", 3);
      matomo.useMatomoEvent("onboarding", "p2p", 3, "connected", connected);
      return null;
    };
    const view = render(<Flow connected={0} />);
    now.mockReturnValue(95_000);
    view.rerender(<Flow connected={1} />);
    view.unmount();
    const values = sent()
      .filter(([command]) => command === "trackEvent")
      .map(([, , , name, value]) => [name, value]);
    expect(values).toEqual([
      ["screen_onboarding_p2p_3", undefined],
      ["screen_onboarding_p2p_3_connected_0", 0],
      ["screen_onboarding_p2p_3_connected_1", 95],
      ["screen_onboarding_p2p_3_time", 95],
    ]);
  });

  it("makes a screen without a URL a page, and starts Matomo for it", async () => {
    const matomo = await load();
    const Screen = () => {
      matomo.useMatomoVirtualPage("login_error");
      return null;
    };
    render(<Screen />).unmount();
    expect(sent()[0]).toEqual(["disableCookies"]);
    expect(sent()).toContainEqual(["trackPageView"]);
    expect(urls().at(-1)).toBe(`${window.location.origin}/login_error`);
  });

  it("gives a full-screen view its own heatmap URL until it closes", async () => {
    const matomo = await start();
    matomo.trackPageView("/peers");
    matomo.enableHeatmaps();
    window._paq = [];
    const Screen = ({ step }: { step: number }) => {
      matomo.useMatomoHeatmap("onboarding", "p2p", step);
      return null;
    };
    const view = render(<Screen step={3} />);
    view.rerender(<Screen step={4} />);
    view.unmount();
    const origin = window.location.origin;
    expect(urls()).toEqual([
      `${origin}/view/onboarding_p2p_3`,
      `${origin}/view/onboarding_p2p_4`,
      `${origin}/peers`,
    ]);
    expect(names()).toEqual([]);
  });
});

describe("sendMatomoEvent", () => {
  it("passes on onboarding events and ignores the rest", async () => {
    const { sendMatomoEvent } = await start();
    sendMatomoEvent("Onboarding", "Skipped Onboarding - p2p (Step 4)");
    sendMatomoEvent("Onboarding", "Finished Onboarding");
    sendMatomoEvent("Billing", "subscribe_Team");
    sendMatomoEvent("New Sign-up", "New Sign-up");
    expect(names()).toEqual([
      "onboarding_skipped_onboarding_p2p_step_4",
      "onboarding_finished_onboarding",
    ]);
  });

  it("never throws, whatever it gets", async () => {
    const matomo = await start();
    const Screen = ({ name }: { name: unknown }) => {
      matomo.useMatomoEvent(name as never, name as never);
      matomo.useMatomoVirtualPage(name as never);
      matomo.useMatomoHeatmap(name as never);
      return null;
    };
    for (const name of [undefined, null, {}, 42, 0, "", "x"]) {
      expect(() => render(<Screen name={name} />).unmount()).not.toThrow();
    }
    expect(() => {
      matomo.sendMatomoEvent(undefined as never, undefined as never);
      matomo.sendMatomoEvent("Onboarding", null as never);
      matomo.sendMatomoEvent("Onboarding", 42 as never);
    }).not.toThrow();
  });
});

describe("MatomoSession", () => {
  const user = { id: "user-1", email: "a@b.c", role: "owner" };
  const account = { id: "account-1", created_at: "2026-11-01T00:00:00Z" };
  const commands = (name: string) =>
    sent().filter(([command]) => command === name);
  const dimension = (id: number) =>
    commands("setCustomDimension").filter(([, dim]) => dim === id);

  it("waits for the account, then sends it once, before the first page view", async () => {
    const { MatomoProvider } = await load();
    session.user = user;
    const { rerender } = render(<MatomoProvider />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(commands("setUserId")).toEqual([]);

    session.account = account;
    rerender(<MatomoProvider />);
    await waitFor(() => expect(commands("trackPageView")).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));

    const order = sent().map(([command, dim]) =>
      command === "setCustomDimension" ? `dimension_${dim}` : command,
    );
    expect(dimension(6)).toHaveLength(1);
    expect(dimension(6)[0][2]).toMatch(/^[0-9a-f]{64}$/);
    expect(order.indexOf("dimension_6")).toBeLessThan(
      order.indexOf("trackPageView"),
    );
  });

  it("starts without the account when the user may not read it", async () => {
    const { MatomoProvider } = await load();
    session.user = user;
    session.canReadAccounts = false;
    render(<MatomoProvider />);
    await waitFor(() => expect(commands("trackPageView")).toHaveLength(1));
    expect(dimension(6)).toEqual([]);
  });

  it("sends a new account when it changes", async () => {
    const { MatomoProvider } = await load();
    session.user = user;
    session.account = account;
    const { rerender } = render(<MatomoProvider />);
    await waitFor(() => expect(dimension(6)).toHaveLength(1));

    session.account = { ...account, id: "account-2" };
    rerender(<MatomoProvider />);
    await waitFor(() => expect(dimension(6)).toHaveLength(2));
    expect(dimension(6)[1][2]).not.toBe(dimension(6)[0][2]);
  });

  it("sends nothing for excluded users", async () => {
    environment.config.analyticsExcludedEmails = [user.email];
    const { MatomoProvider } = await load();
    session.user = user;
    session.account = account;
    render(<MatomoProvider />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent()).toEqual([]);
  });

  it("drops what excluded users did, even when a screen starts Matomo later", async () => {
    environment.config.analyticsExcludedEmails = [user.email];
    const matomo = await load();
    session.user = user;
    session.account = account;
    matomo.trackEvent("policy", "modal_opened");
    render(<matomo.MatomoProvider />);
    const Screen = () => {
      matomo.useMatomoVirtualPage("login_error");
      return null;
    };
    render(<Screen />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent()).toEqual([]);
  });

  it("stops Matomo when a screen started it before the user turned out excluded", async () => {
    environment.config.analyticsExcludedEmails = [user.email];
    const matomo = await load();
    const Screen = () => {
      matomo.useMatomoVirtualPage("login_error");
      return null;
    };
    render(<Screen />);
    expect(sent()).toContainEqual(["trackPageView"]);
    session.user = user;
    session.account = account;
    render(<matomo.MatomoProvider />);
    matomo.trackEvent("policy", "modal_opened");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent()).toEqual([["requireConsent"]]);
  });

  it("sends nothing in Datadog synthetic runs", async () => {
    window._DATADOG_SYNTHETICS_BROWSER = true;
    try {
      const { MatomoProvider } = await load();
      session.user = user;
      session.account = account;
      render(<MatomoProvider />);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(sent()).toEqual([]);
    } finally {
      delete window._DATADOG_SYNTHETICS_BROWSER;
    }
  });

  it("starts without the account when it never loads", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const { MatomoProvider } = await load();
    session.user = user;
    render(<MatomoProvider />);
    expect(commands("setUserId")).toEqual([]);
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();
    await waitFor(() => expect(commands("trackPageView")).toHaveLength(1));
    expect(commands("setUserId")).toHaveLength(1);
    expect(dimension(6)).toEqual([]);
  });

  it("buckets what it reports about the account", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-06") });
    const { MatomoProvider } = await load();
    session.user = user;
    session.account = account;
    session.peers = [{ connected: true }, { connected: false }];
    render(<MatomoProvider />);
    await waitFor(() => expect(commands("trackPageView")).toHaveLength(1));
    vi.useRealTimers();
    expect(dimension(2).at(-1)?.[2]).toBe("owner");
    expect(dimension(3).at(-1)?.[2]).toBe("1-7 days");
    expect(dimension(4).at(-1)?.[2]).toBe("2-5");
    expect(dimension(5).at(-1)?.[2]).toBe("2026-11");
    expect(dimension(7).at(-1)?.[2]).toBe("dashboard");
  });
});
