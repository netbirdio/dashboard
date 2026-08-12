/**
 * What the user is looking at, made available to the assistant.
 *
 * The dashboard is a lot of pages, and a question asked while staring at one
 * peer usually means *that* peer. Rather than teach every page about the
 * assistant, anything that can name what it's showing registers here and the
 * panel picks up the deepest registration.
 *
 * Two ways in, and they're the same hook:
 *  - `RouteAssistantContext` derives an entry from the URL, which covers every
 *    page the dashboard addresses with a path and an id (most of them).
 *  - A modal held in local state calls `useAssistantContext(...)` itself. One
 *    line, and it clears itself when the modal closes.
 *
 * A registration is scoped to the component that made it: the route entry
 * re-registers on navigation and a modal's disappears when it unmounts, so the
 * context is always the current surface. Nothing accumulates.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * The surfaces that can actually publish a context: a page with its own URL.
 *
 * Everything else in the dashboard is edited in a modal, and a modal covers the
 * panel — there is nothing to show a chip in, so those kinds aren't modelled.
 * Add one here when it gets a page of its own.
 */
export type AssistantContextType =
  | "peer"
  | "group"
  | "network"
  | "user"
  | "settings"
  | "integration";

export interface AssistantContextEntry {
  /**
   * Identity of this registration. Dismissal is remembered against it, so a
   * dismissed chip stays gone until the user is looking at something else.
   */
  key: string;
  type: AssistantContextType;
  /** The resource's id, when the surface is about one. */
  id?: string;
  /** Shown when there's no id to resolve a name from (a settings tab). */
  label?: string;
}

interface AssistantContextState {
  /** The deepest live registration, or null once dismissed or off-surface. */
  entry: AssistantContextEntry | null;
  /**
   * Drop the current chip. It comes back when the user is looking at something
   * else — including this same page, arrived at again.
   */
  dismiss: () => void;
  register: (entry: AssistantContextEntry) => () => void;
}

const Ctx = createContext<AssistantContextState | null>(null);

export function AssistantContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // A stack, not a single value: a modal opened over a peer page registers on
  // top and the peer comes back when it closes.
  const [stack, setStack] = useState<AssistantContextEntry[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const register = useCallback((entry: AssistantContextEntry) => {
    setStack((prev) => [...prev.filter((e) => e.key !== entry.key), entry]);
    return () => setStack((prev) => prev.filter((e) => e.key !== entry.key));
  }, []);

  const top = stack[stack.length - 1] ?? null;

  /*
    Dismissal lasts exactly as long as the surface does. Adjusted during render
    rather than in an effect so the chip never flashes back for a frame — and
    keyed on "the top changed at all", not on the key matching, because leaving
    a page and returning to it is a new visit even though the key repeats.
  */
  const [lastKey, setLastKey] = useState<string | null>(top?.key ?? null);
  if (lastKey !== (top?.key ?? null)) {
    setLastKey(top?.key ?? null);
    setDismissed(null);
  }

  const entry = top && top.key === dismissed ? null : top;

  const value = useMemo<AssistantContextState>(
    () => ({
      entry,
      dismiss: () => setDismissed(top?.key ?? null),
      register,
    }),
    [entry, top, register],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Publish what this component is showing, or `null` when it's showing nothing
 * worth mentioning. Safe to call outside the provider — it does nothing, so a
 * page rendered in isolation (tests, storybook) doesn't need it.
 */
export function useAssistantContext(entry: AssistantContextEntry | null): void {
  const state = useContext(Ctx);
  const register = state?.register;

  // Depend on the fields, not the object: callers build the entry inline, and
  // a fresh object every render would re-register on every render.
  const { key, type, id, label } = entry ?? {};

  useEffect(() => {
    if (!register || !key || !type) return;
    return register({ key, type, id, label });
  }, [register, key, type, id, label]);
}

/** The chip's data, for the panel. */
export function useActiveAssistantContext(): {
  entry: AssistantContextEntry | null;
  dismiss: () => void;
} {
  const state = useContext(Ctx);
  return {
    entry: state?.entry ?? null,
    dismiss: state?.dismiss ?? (() => {}),
  };
}
