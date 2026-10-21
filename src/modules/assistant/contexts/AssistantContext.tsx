"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useRef } from "react";
import { AssistantEngine } from "../hooks/useAssistant";
import type { ManagementFetch } from "../lib/reads";
import type { BrowserToolExecutor } from "../lib/tools";

export interface AssistantProviderProps {
  /** Origin of the assistant service, e.g. "https://assistant.example.com". */
  host: string;
  /** Resolved before every request; must include the NetBird OIDC bearer. */
  headers: () => Promise<Record<string, string>>;
  navigate: (href: string) => void;
  currentPath: () => string;
  /**
   * The signed-in NetBird user. It scopes the persisted and the live session,
   * so the next user on the same tab cannot resume or continue the previous one's conversation.
   * Changing it starts a new session;
   * a host that resolves the user asynchronously should mount the provider once the id is known.
   */
  currentUserId?: string;
  /** Read at send time; rides the page-context header. */
  pageContext?: () => string | null;
  /** Executors for browser tools the SDK has no built-in for, such as dashboard_page_redirect. */
  extraExecutors?: Record<string, BrowserToolExecutor>;
  /**
   * Reads the management API as the signed-in user, for the assistant's account reads.
   * The agent never holds the user's token, so without it the assistant cannot read the account.
   */
  fetchManagement?: ManagementFetch;
  /** Keys the session persisted in sessionStorage; defaults to one conversation per app. */
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
  // Callback props are read through a ref,
  // so the context value does not churn when the host re-creates them on every render.
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

/**
 * Mounts the assistant: the config context, the eve session, the client-tool loop and the assistant-ui runtime.
 *
 * The engine is keyed on host and conversation id because eve reads its session config once per mount,
 * and on the user because a session id resumes one user's transcript,
 * so a sign-in that swaps the user must not inherit the previous one's session.
 */
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
