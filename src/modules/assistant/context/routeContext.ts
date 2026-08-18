/**
 * The URL as context. Mounted once, next to the panel.
 *
 * Nearly every detail surface in the dashboard is already addressed by its
 * path plus a query parameter (`/peer?id=…`, `/settings?tab=…`), so a table
 * covers them all without any page knowing the assistant exists. Adding a
 * surface is a row here.
 *
 * What this *can't* see is a modal held in local state — those can call
 * `useAssistantContext` themselves.
 */
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  type AssistantContextEntry,
  type AssistantContextType,
  useAssistantContext,
} from "./AssistantContextProvider";

interface RouteRule {
  /** Exact pathname. Detail pages all live at a fixed path with an id. */
  path: string;
  type: AssistantContextType;
  /** Query parameter holding the resource id. */
  idParam?: string;
  /** Query parameter naming a sub-view, for surfaces with no resource. */
  tabParam?: string;
  /** Used when neither parameter is present. Omit to register nothing. */
  label?: string;
}

/**
 * Overview pages are deliberately absent: "the user is on the peers list" says
 * nothing a question wouldn't already say, and a chip that's always there stops
 * being read. Posture checks, setup keys and access policies are edited in
 * modals over their list page, so there's no URL to key them off — and with the
 * panel hidden behind an open modal, there's nothing to show them in either.
 */
const ROUTES: RouteRule[] = [
  { path: "/peer", type: "peer", idParam: "id" },
  { path: "/group", type: "group", idParam: "id" },
  { path: "/network", type: "network", idParam: "id" },
  { path: "/team/user", type: "user", idParam: "id" },
  { path: "/settings", type: "settings", tabParam: "tab", label: "Settings" },
  {
    path: "/integrations",
    type: "integration",
    tabParam: "tab",
    label: "Integrations",
  },
];

/**
 * Acronyms the dashboard writes in full caps. Title-casing a slug would
 * otherwise produce "Edr" and "Sso", which look like typos.
 */
const ACRONYMS = new Set(["edr", "idp", "sso", "dns", "api", "msp", "ssh"]);

/**
 * Tab slug → the tab's own label: `event-streaming` → `Event Streaming`,
 * `setup-keys` → `Setup Keys`, `edr` → `EDR`. Title case, because that's how
 * the tabs themselves are written.
 */
const prettyTab = (tab: string) =>
  tab
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");

export function routeEntry(
  pathname: string,
  params: URLSearchParams,
): AssistantContextEntry | null {
  const rule = ROUTES.find((candidate) => candidate.path === pathname);
  if (!rule) return null;

  const id = rule.idParam ? params.get(rule.idParam) : null;
  if (id) return { key: `${rule.type}:${id}`, type: rule.type, id };

  const tab = rule.tabParam ? params.get(rule.tabParam) : null;
  if (tab) {
    return {
      key: `${rule.type}:${tab}`,
      type: rule.type,
      label: `${rule.label ?? rule.type} · ${prettyTab(tab)}`,
    };
  }

  // A detail page without its id isn't showing anything yet.
  if (rule.idParam) return null;

  return rule.label
    ? { key: rule.type, type: rule.type, label: rule.label }
    : null;
}

export function RouteAssistantContext() {
  const pathname = usePathname();
  const params = useSearchParams();

  const entry = useMemo(
    () => routeEntry(pathname ?? "", new URLSearchParams(params?.toString())),
    [pathname, params],
  );

  useAssistantContext(entry);
  return null;
}

export default RouteAssistantContext;
