"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useRef } from "react";
import { AssistantEngine } from "../hooks/useAssistant";
import type { ManagementFetch } from "../lib/reads";
import type { BrowserToolExecutor } from "../lib/tools";

export interface AssistantProviderProps {
  host: string;
  /** Must include the NetBird OIDC bearer. */
  headers: () => Promise<Record<string, string>>;
  navigate: (href: string) => void;
  currentPath: () => string;
  /**
   * Scopes the session, so the next user on the same tab cannot resume the previous one's conversation.
   * Mount the provider only once the id is known: changing it starts a new session.
   */
  currentUserId?: string;
  pageContext?: () => string | null;
  extraExecutors?: Record<string, BrowserToolExecutor>;
  fetchManagement?: ManagementFetch;
  conversationId?: string;
  children: ReactNode;
}

interface AssistantContextValue {
  host: string;
  conversationId: string;
  headers: () => Promise<Record<string, string>>;
  navigate: (href: string) => void;
  currentPath: () => string;
  currentUserId?: string;
  pageContext: () => string | null;
  extraExecutors: Record<string, BrowserToolExecutor>;
  fetchManagement?: ManagementFetch;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

function AssistantConfigProvider({
  host,
  headers,
  navigate,
  currentPath,
  currentUserId,
  pageContext,
  extraExecutors,
  fetchManagement,
  conversationId = "default",
  children,
}: Readonly<AssistantProviderProps>) {
  const propsRef = useRef({
    headers,
    navigate,
    currentPath,
    pageContext,
    extraExecutors,
    fetchManagement,
  });
  propsRef.current = {
    headers,
    navigate,
    currentPath,
    pageContext,
    extraExecutors,
    fetchManagement,
  };

  const value = useMemo<AssistantContextValue>(
    () => ({
      host,
      conversationId,
      currentUserId,
      headers: (...args) => propsRef.current.headers(...args),
      navigate: (href) => propsRef.current.navigate(href),
      currentPath: () => propsRef.current.currentPath(),
      pageContext: () => propsRef.current.pageContext?.() ?? null,
      get extraExecutors() {
        return propsRef.current.extraExecutors ?? {};
      },
      get fetchManagement() {
        return propsRef.current.fetchManagement;
      },
    }),
    [host, conversationId, currentUserId],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error(
      "NetBird assistant hooks must be used inside <AssistantProvider>",
    );
  }
  return ctx;
}

// The engine key includes the user: eve reads its session config once per mount,
// and a sign-in that swaps the user must not inherit the previous session.
export function AssistantProvider(props: Readonly<AssistantProviderProps>) {
  const { children, ...config } = props;
  return (
    <AssistantConfigProvider {...config}>
      <AssistantEngine
        key={`${props.host}::${props.conversationId ?? "default"}::${
          props.currentUserId ?? "anonymous"
        }`}
      >
        {children}
      </AssistantEngine>
    </AssistantConfigProvider>
  );
}
