export type NavigateToPage = { href: string } | { error: string };

// `open_page`: turns the tool input into the route to push. Unknown pages are
// refused rather than guessed — a wrong push moves the user's screen for no reason.
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
    control_center: "/control-center",
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
  };

  const page = typeof input.page === "string" ? input.page : "";

  if (routes[page]) return { href: routes[page] };

  if (tabRoutes[page]) {
    const tab = typeof input.tab === "string" ? input.tab.trim() : "";
    return {
      href: tab
        ? `${tabRoutes[page]}?tab=${encodeURIComponent(tab)}`
        : tabRoutes[page],
    };
  }

  if (detailRoutes[page]) {
    const id = typeof input.id === "string" ? input.id.trim() : "";
    if (id) {
      return { href: `${detailRoutes[page]}?id=${encodeURIComponent(id)}` };
    }
  }

  return {
    error:
      "That isn't a page in this dashboard, or the detail page was missing its id. Didn't navigate.",
  };
}
