import loadConfig from "@utils/config";
import { isNetBirdCloud } from "@utils/netbird";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useBilling } from "@/contexts/BillingProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { Role } from "@/interfaces/User";
import { useAccount } from "@/modules/account/useAccount";

declare global {
  interface Window {
    _paq?: unknown[][];
    Matomo?: {
      getAsyncTracker?: () => unknown;
      HeatmapSessionRecording?: {
        tracking?: { sendQueuedData?: (tracker: unknown) => void };
      };
    };
  }
}

const config = loadConfig();

const { matomoUrl, matomoSiteId: siteId } = config;

let blocked = false;

export const isMatomoEnabled = () =>
  isNetBirdCloud() &&
  !!matomoUrl &&
  !!siteId &&
  !blocked &&
  typeof window !== "undefined" &&
  window._DATADOG_SYNTHETICS_BROWSER === undefined;

const ignoreErrors = <T,>(run: () => T): T | undefined => {
  try {
    return run();
  } catch {
    return undefined;
  }
};

export const toKey = (value: unknown) => {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("@") || text.includes(".")) return "invalid";
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  return words.join("_").slice(0, 64) || "root";
};

let started = false;
let userIdSet = false;
const queue: unknown[][] = [];
let heatmaps = false;
let lastUrl: string | undefined;
let view: string | undefined;
const modals: { flow: string; tab?: string }[] = [];

const push = (...command: unknown[]) => {
  if (!isMatomoEnabled()) return;
  if (started) (window._paq ??= []).push(command);
  else if (queue.length < 50) queue.push(command);
};

export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
) => {
  const parts = [category, action, label].filter(Boolean).map(toKey);
  push("trackEvent", parts[0], parts[1], parts.join("_"), value);
};

export const trackPageView = (path: string) => {
  const url = `${window.location.origin}${path}`;
  const referrer =
    lastUrl ?? ignoreErrors(() => new URL(document.referrer).origin) ?? "";
  push("setReferrerUrl", referrer);
  push("setCustomUrl", url);
  push("setDocumentTitle", path);
  push("trackPageView");
  lastUrl = url;
};

const updateHeatmapUrl = () => {
  if (!heatmaps) return;
  const modal = modals.at(-1);
  const base = view ? `${window.location.origin}/view/${view}` : lastUrl;
  const tab = modal?.tab ? `/${modal.tab}` : "";
  push("setCustomUrl", modal ? `${base}/modal/${modal.flow}${tab}` : base);
  push("HeatmapSessionRecording::setNewPageView", true);
  document.documentElement.toggleAttribute("data-matomo-modal", !!modal);
};

const HEATMAP_VIEWER_CSS = [
  "html.matomoHsr body { overflow: visible !important; }",
  "html.matomoHsr .h-screen { height: auto !important; }",
  "html.matomoHsr .flex-auto.overflow-auto { overflow: visible !important; }",
  'html.matomoHsr:not([data-matomo-modal]) :has(> [role="dialog"]) { display: none !important; }',
].join("\n");

const sendHeatmapData = (event: Event) =>
  ignoreErrors(() => {
    if (event instanceof KeyboardEvent && !/^(Escape|Enter)$/.test(event.key)) {
      return;
    }
    const matomo = window.Matomo;
    matomo?.HeatmapSessionRecording?.tracking?.sendQueuedData?.(
      matomo.getAsyncTracker?.(),
    );
  });

export const enableHeatmaps = () => {
  if (heatmaps) return;
  heatmaps = true;
  ignoreErrors(() => {
    const style = document.createElement("style");
    style.textContent = HEATMAP_VIEWER_CSS;
    document.head.appendChild(style);
    document.addEventListener("pointerdown", sendHeatmapData, true);
    document.addEventListener("keydown", sendHeatmapData, true);
  });
  push("HeatmapSessionRecording::enable");
  updateHeatmapUrl();
};

const SESSION_FIELDS = ["conditionsMet", "min_time", "activity", "keystrokes"];

export const isHeatmapRecording = (config: unknown) =>
  !!config &&
  typeof config === "object" &&
  !SESSION_FIELDS.some((field) => field in config);

export const initMatomo = (hashedUserId?: string) => {
  if (started) {
    if (hashedUserId && !userIdSet) {
      userIdSet = true;
      push("setUserId", hashedUserId);
    }
    return;
  }
  if (!isMatomoEnabled() || !matomoUrl) return;
  started = true;
  push("disableCookies");
  push("FormAnalytics::disableFormAnalytics");
  push("MediaAnalytics::disableMediaAnalytics");
  push("setTrackerUrl", `${matomoUrl}/matomo.php`);
  push("setSiteId", siteId);
  if (hashedUserId) {
    userIdSet = true;
    push("setUserId", hashedUserId);
  }
  push("enableHeartBeatTimer");
  push("HeatmapSessionRecording::disable");
  push("HeatmapSessionRecording::disableCaptureKeystrokes");
  push("HeatmapSessionRecording::setTrigger", isHeatmapRecording);
  push("HeatmapSessionRecording::matchTrackerUrl");
  push("setCustomUrl", `${window.location.origin}${window.location.pathname}`);
  push(
    "setReferrerUrl",
    ignoreErrors(() => new URL(document.referrer).origin) ?? "",
  );
  queue.splice(0).forEach((command) => push(...command));
  ignoreErrors(() => {
    const { host } = new URL(matomoUrl);
    const script = document.createElement("script");
    script.async = true;
    script.src = host.endsWith(".matomo.cloud")
      ? `https://cdn.matomo.cloud/${host}/matomo.js`
      : `${matomoUrl}/matomo.js`;
    document.head.appendChild(script);
  });
};

const activeTab = (flow: string, dialog?: Element) => {
  const id = dialog?.querySelector(
    '[role="tablist"] [role="tab"][data-state="active"]',
  )?.id;
  if (!id?.includes("-trigger-")) return undefined;
  const value = id.split("-trigger-")[1];
  const os = flow === "peer_setup" ? OperatingSystem[Number(value)] : undefined;
  return toKey(os ?? value);
};

export const ModalInsights = ({ flow }: { flow: string }) => {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!isMatomoEnabled()) return;
    const stop = ignoreErrors(() => {
      const dialog = marker.current?.closest('[role="dialog"]') ?? undefined;
      const modal = { flow: toKey(flow), tab: activeTab(toKey(flow), dialog) };
      modals.push(modal);
      updateHeatmapUrl();
      trackEvent(flow, "modal_opened");
      if (modal.tab) trackEvent(flow, "tab_viewed", modal.tab);
      const observer = new MutationObserver(() =>
        ignoreErrors(() => {
          const tab = activeTab(modal.flow, dialog);
          if (!tab || tab === modal.tab) return;
          modal.tab = tab;
          updateHeatmapUrl();
          trackEvent(flow, "tab_viewed", tab);
        }),
      );
      if (dialog) {
        observer.observe(dialog, {
          subtree: true,
          attributes: true,
          attributeFilter: ["data-state"],
        });
      }
      return () => {
        observer.disconnect();
        modals.splice(modals.indexOf(modal), 1);
        updateHeatmapUrl();
      };
    });
    return () => ignoreErrors(() => stop?.());
  }, [flow]);
  return isMatomoEnabled() ? <span ref={marker} hidden /> : null;
};

type Part = string | number | false | null | undefined;

const keyOf = (parts: Part[]) =>
  parts[0] ? toKey(parts.filter((part) => part || part === 0).join(" ")) : "";

export const useMatomoVirtualPage = (...parts: Part[]) => {
  const key = keyOf(parts);
  useEffect(() => {
    ignoreErrors(() => {
      if (!key) return;
      initMatomo();
      trackPageView(`/${key}`);
    });
  }, [key]);
};

export const useMatomoHeatmap = (...parts: Part[]) => {
  const key = keyOf(parts);
  useEffect(() => {
    ignoreErrors(() => {
      view = key || undefined;
      updateHeatmapUrl();
    });
  }, [key]);
  useEffect(
    () => () => {
      view = undefined;
      ignoreErrors(updateHeatmapUrl);
    },
    [],
  );
};

let step: { key: string; start: number } | undefined;

const secondsInStep = () =>
  step ? Math.round((Date.now() - step.start) / 1000) : undefined;

export const useMatomoStep = (position: number, ...parts: Part[]) => {
  const key = keyOf(parts);
  const last = useRef<number>(undefined);
  useEffect(() => {
    if (!key) return;
    const current = { key, start: Date.now() };
    ignoreErrors(() => {
      trackEvent("screen", key);
      if (last.current === undefined && position > 0) {
        trackEvent("screen", `${key}_resumed`);
      }
      if (last.current !== undefined && position < last.current) {
        trackEvent("screen", `${key}_back`);
      }
      last.current = position;
      step = current;
    });
    return () =>
      ignoreErrors(() => {
        const seconds = Math.round((Date.now() - current.start) / 1000);
        if (seconds > 0) trackEvent("screen", `${key}_time`, "", seconds);
        if (step === current) step = undefined;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
};

export const useMatomoEvent = (...parts: Part[]) => {
  const key = keyOf(parts);
  useEffect(() => {
    if (key) ignoreErrors(() => trackEvent("screen", key, "", secondsInStep()));
  }, [key]);
};

export const sendMatomoEvent = (category: string, action: string) => {
  if (category === "Onboarding") {
    ignoreErrors(() => trackEvent("onboarding", action));
  }
};

const DIMENSIONS = {
  plan: 1,
  role: 2,
  accountAge: 3,
  peerCount: 4,
  signupMonth: 5,
  account: 6,
  product: 7,
  subscription: 8,
};

const setDimension = (dimension: keyof typeof DIMENSIONS, value?: string) => {
  if (value) push("setCustomDimension", DIMENSIONS[dimension], value);
};

const hash = (id: string) =>
  crypto?.subtle
    ? crypto.subtle
        .digest("SHA-256", new TextEncoder().encode(id))
        .then((digest) =>
          Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
        )
        .catch(() => undefined)
    : Promise.resolve(undefined);

const daysSince = (date?: string) => {
  const time = date ? Date.parse(date) : NaN;
  return Number.isNaN(time)
    ? undefined
    : Math.floor((Date.now() - time) / 86_400_000);
};

const SEES_ALL_PEERS: string[] = [
  Role.Owner,
  Role.Admin,
  Role.NetworkAdmin,
  Role.Auditor,
];

export const MatomoProvider = () =>
  isMatomoEnabled() ? <MatomoSession /> : null;

const MatomoSession = () => {
  const { loggedInUser } = useLoggedInUser();
  const account = useAccount();
  const { subscription, stats } = useBilling() ?? {};
  const { permission } = usePermissions();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [accountTimedOut, setAccountTimedOut] = useState(false);
  const sentAccountId = useRef<string>(undefined);
  const { data: peers } = useSWR<Peer[]>("/peers", null);

  const userId = loggedInUser?.id;
  const excluded = !!config.analyticsExcludedEmails?.includes(
    loggedInUser?.email ?? "",
  );
  const role = loggedInUser?.role;
  const accountId = account?.id;
  const waitForAccount =
    !accountId && !!permission?.accounts?.read && !accountTimedOut;
  const createdAt = account?.created_at;
  const product = !account
    ? undefined
    : account.settings?.agent_network_only
    ? "agent_network_only"
    : account.settings?.dashboard_features?.agent_network
    ? "dashboard_and_agent_network"
    : "dashboard";
  const tier = subscription?.plan_tier;
  const status = !subscription
    ? undefined
    : !tier || tier === "free"
    ? "free"
    : tier === "trial" || (subscription.remaining_trial ?? 0) > 0
    ? "trial"
    : subscription.active
    ? "active"
    : "inactive";
  const list =
    role && SEES_ALL_PEERS.includes(role) && Array.isArray(peers)
      ? peers
      : undefined;
  const totals = [stats?.total_peers, list?.length].filter(
    (n): n is number => typeof n === "number",
  );
  const totalPeers = totals.length ? Math.max(...totals) : undefined;

  useEffect(() => {
    const timer = setTimeout(() => setAccountTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (excluded) {
      blocked = true;
      queue.length = 0;
      if (started) {
        ignoreErrors(() => {
          if (Array.isArray(window._paq)) window._paq.length = 0;
          window._paq?.push(["requireConsent"]);
        });
      }
      return;
    }
    if (ready || !userId || waitForAccount) return;
    let cancelled = false;
    Promise.all([hash(userId), accountId && hash(accountId)]).then(
      ([hashedUserId, hashedAccountId]) =>
        ignoreErrors(() => {
          if (cancelled) return;
          initMatomo(hashedUserId);
          setDimension("account", hashedAccountId);
          sentAccountId.current = accountId;
          setReady(true);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [userId, accountId, excluded, waitForAccount, ready]);

  const age = daysSince(createdAt);

  useEffect(() => {
    ignoreErrors(() => {
      if (!ready) return;
      setDimension("role", role);
      setDimension("plan", tier);
      setDimension("subscription", status);
      setDimension("product", product);
      if (typeof totalPeers === "number") {
        const buckets: [number, string][] = [
          [0, "0"],
          [1, "1"],
          [5, "2-5"],
          [25, "6-25"],
          [100, "26-100"],
        ];
        const bucket =
          buckets.find(([max]) => totalPeers <= max)?.[1] ?? "100+";
        setDimension("peerCount", bucket);
      }
      if (age !== undefined) {
        const buckets: [number, string][] = [
          [0, "<1 day"],
          [7, "1-7 days"],
          [30, "8-30 days"],
          [90, "31-90 days"],
        ];
        const bucket = buckets.find(([max]) => age <= max)?.[1] ?? "90+ days";
        setDimension("accountAge", bucket);
      }
      setDimension("signupMonth", createdAt?.slice(0, 7));
    });
  }, [ready, role, tier, status, product, totalPeers, age, createdAt]);

  useEffect(() => {
    if (ready && pathname) ignoreErrors(() => trackPageView(pathname));
  }, [ready, pathname]);

  useEffect(() => {
    if (ready && age !== undefined && age <= 30) ignoreErrors(enableHeatmaps);
  }, [ready, age]);

  useEffect(() => {
    if (!ready || !accountId || accountId === sentAccountId.current) return;
    let cancelled = false;
    hash(accountId).then((hashed) => {
      if (cancelled) return;
      setDimension("account", hashed);
      sentAccountId.current = accountId;
    });
    return () => {
      cancelled = true;
    };
  }, [ready, accountId]);

  return null;
};
