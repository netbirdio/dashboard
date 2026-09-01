// What the user is looking at, made available to the assistant. Detail pages
// register via the URL (the route watcher below).
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PageContextEntry, PageContextType } from "@/interfaces/Assistant";

interface AssistantChatContextState {
  entry: PageContextEntry | null;
  dismiss: () => void;
  register: (entry: PageContextEntry) => () => void;
}

const ChatContext = createContext<AssistantChatContextState | null>(null);

export function AssistantChatContextProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A stack, not a single value: a modal opened over a peer page can register
  // on top and the peer comes back when it closes.
  const [stack, setStack] = useState<PageContextEntry[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const register = useCallback((entry: PageContextEntry) => {
    const without = (list: PageContextEntry[]) =>
      list.filter((e) => e.key !== entry.key);
    setStack((prev) => [...without(prev), entry]);
    return () => setStack(without);
  }, []);

  const top = stack[stack.length - 1] ?? null;

  // Reset during render, not in an effect, so the chip never flashes back for
  // a frame. Keyed on "the top changed": returning to a page is a new visit.
  const [lastKey, setLastKey] = useState<string | null>(top?.key ?? null);
  if (lastKey !== (top?.key ?? null)) {
    setLastKey(top?.key ?? null);
    setDismissed(null);
  }

  const entry = top && top.key === dismissed ? null : top;

  const value = useMemo<AssistantChatContextState>(
    () => ({
      entry,
      dismiss: () => setDismissed(top?.key ?? null),
      register,
    }),
    [entry, top, register],
  );

  return (
    <ChatContext.Provider value={value}>
      {/* Inside Suspense because `useSearchParams` opts the tree out of
        static rendering otherwise. */}
      <Suspense fallback={null}>
        <AssistantRouteWatcher />
      </Suspense>
      {children}
    </ChatContext.Provider>
  );
}

// No-op outside the provider, so a page rendered in isolation doesn't need it.
function useRegisterPageContext(entry: PageContextEntry | null): void {
  const state = useContext(ChatContext);
  const register = state?.register;

  // Depend on the fields, not the object: callers build the entry inline, and
  // a fresh object every render would re-register on every render.
  const { key, type, id, label } = entry ?? {};

  useEffect(() => {
    if (!register || !key || !type) return;
    return register({ key, type, id, label });
  }, [register, key, type, id, label]);
}

export function useActivePageContext(): {
  entry: PageContextEntry | null;
  dismiss: () => void;
} {
  const state = useContext(ChatContext);
  return {
    entry: state?.entry ?? null,
    dismiss: state?.dismiss ?? (() => {}),
  };
}

// The string the assistant reads. Real values — redaction happens server-side.
function describePageContext(
  entry: PageContextEntry | null,
  name?: string,
): string | null {
  if (!entry) return null;
  if (entry.id) {
    const label = name ?? entry.label;
    return `<page-context kind="${entry.type}" id="${entry.id}"${
      label ? ` label="${label}"` : ""
    } />`;
  }
  return entry.label
    ? `<page-context kind="${entry.type}" label="${entry.label}" />`
    : null;
}

/**
 * Send-time getter for the page-context string; the chat panel hands it to the
 * assistant provider. `name` is the entry's display name when the caller has
 * one (the SWR row). Read through a ref because the getter is captured once
 * per conversation and the user can navigate between two messages.
 */
export function usePageContextString(name?: string): () => string | null {
  const { entry } = useActivePageContext();
  const current = useRef({ entry, name });
  // eslint-disable-next-line react-hooks/refs -- written in render on purpose: see above
  current.current = { entry, name };
  return useCallback(
    () => describePageContext(current.current.entry, current.current.name),
    [],
  );
}

interface RouteRule {
  path: string;
  type: PageContextType;
  idParam?: string;
  tabParam?: string;
  label?: string;
}

// Overview pages are deliberately absent: "on the peers list" says nothing a
// question wouldn't. Modal-edited resources have no URL and register themselves.
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

// Title-casing a slug would otherwise produce "Edr" and "Sso".
const ACRONYMS = new Set(["edr", "idp", "sso", "dns", "api", "msp", "ssh"]);

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

function routeEntry(
  pathname: string,
  params: URLSearchParams,
): PageContextEntry | null {
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

function AssistantRouteWatcher() {
  const pathname = usePathname();
  const params = useSearchParams();

  const entry = useMemo(
    () => routeEntry(pathname ?? "", new URLSearchParams(params?.toString())),
    [pathname, params],
  );

  useRegisterPageContext(entry);
  return null;
}
