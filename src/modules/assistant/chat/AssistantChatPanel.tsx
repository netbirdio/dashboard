// Always mounted so a conversation survives closing; inert + aria-hidden while hidden.
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useOidc,
  useOidcAccessToken,
  useOidcIdToken,
} from "@axa-fr/react-oidc";
import {
  AssistantProvider,
  useAssistant,
} from "@netbird/assistant-react";
import loadConfig from "@utils/config";
import { cn, sleep } from "@utils/helpers";
import { PanelLeft, PanelRight, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeToken, isExpired } from "react-jwt";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import {
  CHAT_PAD,
  type PageContextEntry,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
} from "@/interfaces/Assistant";
import {
  useActivePageContext,
  usePageContextString,
} from "@/modules/assistant/AssistantChatContextProvider";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";
import { useContextChip } from "@/modules/assistant/chat/AssistantContextChip";
import { AssistantThread } from "@/modules/assistant/chat/AssistantThread";
import { openPageExecutor } from "@/modules/assistant/openPageExecutor";
import { createSSHRunCommandExecutor } from "@/modules/assistant/sshRunCommandExecutor";
import { generateKeypair } from "@utils/wireguard";
import { useNetBirdClient } from "@/modules/remote-access/useNetBirdClient";
import { useApiCall } from "@utils/api";
import { requestAccessAuthorization } from "@/modules/assistant/assistantAccessAuth";
import type { Peer } from "@/interfaces/Peer";

/*
  `setup_netbird` is not in here because it cannot be: it needs the agent's
  origin, the bearer resolver and the WASM client, all of which are hooks or
  per-render values. It is composed in the component below and merged with
  this table.
*/
const STATIC_EXECUTORS = { dashboard_page_redirect: openPageExecutor };

/*
  NetBird's SSH server rejects a JWT by AGE, not by expiry: it reads `iat` and
  refuses anything older than ten minutes. An Auth0 access token is valid for
  hours, so the one minted at login passes every `isExpired` check and is still
  refused by the peer as `token expired ... age=1h23m, max=10m0s`.

  The dashboard's SSH window never trips over this because `window.open`
  reloads the page and OIDC issues a fresh token right then. This panel is
  mounted for the whole session, so it has to ask.

  Renewed a few minutes before the server's limit rather than at it, since the
  token has to survive the handshake that follows.
*/
const SSH_TOKEN_MAX_AGE_SECONDS = 10 * 60;
const SSH_TOKEN_RENEW_AFTER_SECONDS = 5 * 60;

function tokenAgeSeconds(token?: string): number | null {
  const payload = token ? decodeToken<{ iat?: number }>(token) : null;
  if (!payload?.iat) return null;
  return Math.max(0, Date.now() / 1000 - payload.iat);
}

// The same token selection and expiry wait as useNetBirdFetch (src/utils/api),
// shaped as the headers resolver the assistant SDK calls before every request.
function useAssistantHeaders(): () => Promise<Record<string, string>> {
  const { idToken } = useOidcIdToken();
  const { accessToken } = useOidcAccessToken();
  const tokenSource = loadConfig().tokenSource || "accessToken";
  const token =
    tokenSource.toLowerCase() === "idtoken" ? idToken : accessToken;

  // Read at request time through a ref: the resolver is captured once per
  // conversation, and the OIDC client refreshes tokens behind it.
  const tokenRef = useRef(token);
  // eslint-disable-next-line react-hooks/refs -- deliberate: see above
  tokenRef.current = token;

  return useCallback(async () => {
    let attempts = 4;
    while (isExpired(tokenRef.current) && attempts > 0) {
      await sleep(500);
      attempts -= 1;
    }
    return { Authorization: `Bearer ${tokenRef.current}` };
  }, []);
}

// One conversation. The provider's runtime feeds assistant-ui exactly as before.
function AssistantConversation() {
  const { runtime } = useAssistant();
  const { entry, dismiss } = useActivePageContext();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread context={entry} onDismissContext={dismiss} />
    </AssistantRuntimeProvider>
  );
}

// Renders nothing: the context's display name comes from a hook (the SWR
// cache), but the page-context getter needs it as a plain value at send time.
function ContextName({
  entry,
  onName,
}: Readonly<{
  entry: PageContextEntry;
  onName: (name: string | undefined) => void;
}>) {
  const { name } = useContextChip(entry);

  useEffect(() => {
    onName(name);
    return () => onName(undefined);
  }, [name, onName]);

  return null;
}

// The icon buttons carry ~10px of empty space around the glyph, so matching
// CHAT_PAD.x would make the header look more inset than the messages.
const HEADER_PAD_X = CHAT_PAD.x - 10;

function PanelButton({
  label,
  onClick,
  children,
}: Readonly<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-nb-gray-300 transition-colors hover:bg-nb-gray-900 hover:text-nb-gray-200"
    >
      {children}
    </button>
  );
}

// Inside the provider so it can reset the SDK session alongside the remount.
function NewChatButton({ onNewChat }: Readonly<{ onNewChat: () => void }>) {
  const { newChat } = useAssistant();

  return (
    <PanelButton
      label="New Chat"
      onClick={() => {
        newChat();
        onNewChat();
      }}
    >
      <Plus size={18} />
    </PanelButton>
  );
}

export function AssistantChatPanel() {
  const { available, open, setOpen, overlay, origin } = useAssistantSidebar();

  const headers = useAssistantHeaders();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname ?? "/");
  // eslint-disable-next-line react-hooks/refs -- read at tool-execution time
  pathRef.current = pathname ?? "/";
  const currentPath = useCallback(() => pathRef.current, []);
  const navigate = useCallback((href: string) => router.push(href), [router]);
  const { loggedInUser } = useLoggedInUser();

  /*
    `setup_netbird`, composed here because it needs three things this component
    has and a module constant cannot: the agent's origin, the same bearer
    resolver the SDK uses, and the WASM client.

    `connect` takes only the private key — the management URL stays whatever
    useNetBirdClient reads from the dashboard's own config, rather than the one
    the agent returns. The browser already knows which management server it
    belongs to, and taking that from an HTTP response would let the agent point
    this tunnel somewhere else.
  */
  const {
    connect,
    createSSHConnection,
    detectSSHServerType,
  } = useNetBirdClient();
  const peersRequest = useApiCall<Peer[]>("/peers");
  const { accessToken } = useOidcAccessToken();

  // Read through a ref so an executor built once still sees the current token;
  // a dispatch can be executed long after the render that created it.
  const accessTokenRef = useRef(accessToken);
  // eslint-disable-next-line react-hooks/refs -- read at tool-execution time
  accessTokenRef.current = accessToken;

  const { renewTokens } = useOidc();
  /**
   * An access token young enough for a peer's SSH server to accept.
   *
   * Renews rather than waits: the token is not expired, it is old, and waiting
   * only makes it older. Falls back to whatever is current if renewal fails —
   * a stale token that gets refused is a clearer failure than none at all.
   */
  const freshAccessToken = useCallback(async (): Promise<string | undefined> => {
    const age = tokenAgeSeconds(accessTokenRef.current);
    if (age !== null && age < SSH_TOKEN_RENEW_AFTER_SECONDS) {
      return accessTokenRef.current;
    }
    try {
      const renewed = (await renewTokens()) as { accessToken?: string };
      return renewed?.accessToken ?? accessTokenRef.current;
    } catch {
      return accessTokenRef.current;
    }
  }, [renewTokens]);

  const extraExecutors = useMemo(
    () => ({
      ...STATIC_EXECUTORS,
      /*
        One executor, because joining the network, taking access to the target
        and running the command are one approved action. `connectTemporary` from
        useNetBirdClient is deliberately not used: it returns early once
        connected, so it would grant access for the first peer only, and it
        hides the keypair that has to be reused for the second.
      */
      ssh_run_command: createSSHRunCommandExecutor({
        // The whole list, because the executor resolves a NAME and the model
        // cannot: peer names reach it as unlabelled tokens, and a typed FQDN
        // tokenises differently from the peer's own dns_label.
        listPeers: async () => (await peersRequest.get()) ?? [],
        generateKeypair,
        /*
          Parks the request for the user rather than calling the API here. The
          panel has the bearer and could grant it directly; routing it through a
          window the user opens and signs in to is the whole point — see
          assistantAccessAuth.
        */
        authorizeAccess: requestAccessAuthorization,
        connect,
        createSSHConnection,
        detectSSHServerType,
        getAccessToken: freshAccessToken,
      }),
    }),
    [
      origin,
      headers,
      connect,
      createSSHConnection,
      detectSSHServerType,
      freshAccessToken,
      peersRequest,
    ],
  );

  const { entry } = useActivePageContext();
  const [contextName, setContextName] = useState<string | undefined>();
  const pageContext = usePageContextString(contextName);

  // Keys the SDK conversation; a fresh id starts a new one.
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const startNewChat = useCallback(() => setChatId(crypto.randomUUID()), []);

  // autoFocus only fires on mount and the panel is always mounted, so opening
  // moves focus itself — a frame later, since an inert subtree can't take focus.
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!available) return null;

  return (
    <aside
      ref={panelRef}
      aria-label="NetBird Assistant"
      aria-hidden={!open}
      // Without inert the hidden panel stays in the tab order behind the card.
      inert={open ? undefined : true}
      className={cn(
        "fixed inset-0 flex",
        PANEL_ON_LEFT ? "justify-start" : "justify-end",
        "bg-nb-gray-925",
        "transition-opacity duration-300 ease-out",
        open ? "opacity-100" : "pointer-events-none opacity-0",
        overlay ? "z-50" : "z-0",
      )}
    >
      <AssistantProvider
        host={origin}
        headers={headers}
        navigate={navigate}
        currentPath={currentPath}
        currentUserId={loggedInUser?.id}
        pageContext={pageContext}
        extraExecutors={extraExecutors}
        conversationId={chatId}
      >
        {entry && <ContextName entry={entry} onName={setContextName} />}

        {/* Rows pad themselves by CHAT_PAD so the scrollbar can sit on the panel's edge. */}
        <div
          className="flex min-h-0 flex-col"
          style={{ width: overlay ? "100%" : PANEL_WIDTH }}
        >
          <header
            className="flex shrink-0 items-center gap-2 pb-2"
            style={{
              paddingLeft: HEADER_PAD_X,
              paddingRight: HEADER_PAD_X,
              paddingTop: CHAT_PAD.top,
            }}
          >
            <PanelButton label="Close assistant" onClick={() => setOpen(false)}>
              {PANEL_ON_LEFT ? <PanelLeft size={17} /> : <PanelRight size={17} />}
            </PanelButton>

            <span className="min-w-0 truncate text-sm font-medium text-nb-gray-100">
              Assistant
            </span>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <NewChatButton onNewChat={startNewChat} />
            </div>
          </header>

          <AssistantConversation />
        </div>
      </AssistantProvider>
    </aside>
  );
}

export default AssistantChatPanel;
