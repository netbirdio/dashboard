import type { ToolOutcome } from "@/modules/assistant/lib/contract";
import type { BrowserToolExecutor } from "@/modules/assistant/lib/tools";
import { getCanvasAgent } from "./canvas";
import { CONTROL_CENTER_HREF } from "./control-center";
import { ownEntry } from "./own";

export type NavigateToPage = { href: string } | { error: string };

export function navigateToPage(input: Record<string, unknown>): NavigateToPage {
  const routes: Record<string, string> = {
    peers: "/peers",
    groups: "/groups",
    access_control: "/access-control",
    posture_checks: "/posture-checks",
    networks: "/networks",
    routes: "/network-routes",
    dns: "/dns/nameservers",
    setup_keys: "/setup-keys",
    users: "/team/users",
    activity: "/events/audit",
    traffic_events: "/events/traffic",
    proxy_events: "/events/proxy",
    reverse_proxy_logs: "/reverse-proxy/logs",
    reverse_proxy_services: "/reverse-proxy/services",
    control_center: "/control-center",
    agent_network_providers: "/agent-network/providers",
    agent_network_policies: "/agent-network/policies",
    agent_network_usage: "/agent-network/usage",
  };
  const detailRoutes: Record<string, string> = {
    peer: "/peer",
    group: "/group",
    network: "/network",
    user: "/team/user",
  };
  const tabRoutes: Record<string, string> = {
    settings: "/settings",
    integrations: "/integrations",
    agent_network_configuration: "/agent-network/configuration",
  };

  const logParams: Record<string, "id" | "search"> = {
    activity: "id",
    traffic_events: "search",
    reverse_proxy_logs: "search",
  };

  const page = typeof input.page === "string" ? input.page : "";

  const route = ownEntry(routes, page);
  if (route) {
    const param = ownEntry(logParams, page);
    const value =
      param && typeof input[param] === "string"
        ? input[param].trim()
        : "";
    return {
      href: value
        ? `${route}?${param}=${encodeURIComponent(value)}`
        : route,
    };
  }

  const tabRoute = ownEntry(tabRoutes, page);
  if (tabRoute) {
    const tab = typeof input.tab === "string" ? input.tab.trim() : "";
    return {
      href: tab
        ? `${tabRoute}?tab=${encodeURIComponent(tab)}`
        : tabRoute,
    };
  }

  const detailRoute = ownEntry(detailRoutes, page);
  if (detailRoute) {
    const id = typeof input.id === "string" ? input.id.trim() : "";
    const tab = typeof input.tab === "string" ? input.tab.trim() : "";
    if (id) {
      const query = `id=${encodeURIComponent(id)}`;
      return {
        href: `${detailRoute}?${query}${
          tab ? `&tab=${encodeURIComponent(tab)}` : ""
        }`,
      };
    }
  }

  return {
    error:
      "That isn't a page in this dashboard, or the detail page was missing its id. Didn't navigate.",
  };
}

export const pageRedirect: BrowserToolExecutor = async (
  input,
  ctx,
): Promise<ToolOutcome> => {
  const target = navigateToPage((input ?? {}) as Record<string, unknown>);
  if ("error" in target) return { ok: false, content: target.error };
  // Leaving the control center drops an open draft, so the user confirms in the canvas's discard dialog first.
  const pending = ctx.onControlCenterPage() && !target.href.startsWith(CONTROL_CENTER_HREF) ? unsavedDraftChanges() : 0;
  if (pending > 0) {
    const left = await getCanvasAgent()?.draftAction("exit");
    if (!left?.ok) {
      const changes = `${pending} unsaved ${pending === 1 ? "change" : "changes"}`;
      return {
        ok: false,
        content: `Didn't navigate: the user chose to keep the draft on the canvas (${changes}). Don't ask again; they can deploy or discard it themselves, and you can offer the page once they have.`,
      };
    }
  }
  ctx.navigate(target.href);
  return { ok: true, content: `Navigated to ${target.href.split("?")[0]}.` };
};

function unsavedDraftChanges(): number {
  const snapshot = getCanvasAgent()?.getSnapshot();
  return snapshot?.mode === "draft" ? snapshot.changes.length : 0;
}
