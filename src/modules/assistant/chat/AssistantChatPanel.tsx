"use client";

import { AssistantRuntimeProvider, useAuiState } from "@assistant-ui/react";
import { cn } from "@utils/helpers";
import { useGuardedRouter } from "@utils/navigation-guard";
import { PanelLeft, PanelRight, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import {
  CHAT_PAD,
  type PageContextEntry,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
} from "@/interfaces/Assistant";
import { AssistantProvider } from "@/modules/assistant/contexts/AssistantContext";
import { useAssistant } from "@/modules/assistant/hooks/useAssistant";
import {
  useActivePageContext,
  usePageContextString,
} from "@/modules/assistant/AssistantChatContextProvider";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";
import { useContextChip } from "@/modules/assistant/chat/AssistantContextChip";
import { AssistantThread } from "@/modules/assistant/chat/AssistantThread";
import { pageRedirect } from "@/modules/assistant/lib/page-redirect";
import { useAssistantHeaders } from "@/modules/assistant/useAssistantHeaders";
import { useAssistantManagementFetch } from "@/modules/assistant/useAssistantManagementFetch";
import { draftUid } from "@/modules/control-center/utils/helpers";

const EXTRA_EXECUTORS = { dashboard_page_redirect: pageRedirect };

function ConversationRuntime({
  children,
  open,
}: Readonly<{ children: React.ReactNode; open: boolean }>) {
  const { runtime, prewarm } = useAssistant();

  useEffect(() => {
    if (open) prewarm();
  }, [open, prewarm]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function AssistantConversation({ onNewChat }: Readonly<{ onNewChat: () => void }>) {
  const { entry, dismiss } = useActivePageContext();
  const { newChat } = useAssistant();

  return (
    <AssistantThread
      context={entry}
      onDismissContext={dismiss}
      onNewChat={() => {
        newChat();
        onNewChat();
      }}
    />
  );
}

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

function NewChatButton({ onNewChat }: Readonly<{ onNewChat: () => void }>) {
  const { newChat } = useAssistant();
  const empty = useAuiState((s) => s.thread.isEmpty);
  if (empty) return null;

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
  const fetchManagement = useAssistantManagementFetch();
  const router = useGuardedRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname ?? "/");
  // eslint-disable-next-line react-hooks/refs -- read at tool-execution time
  pathRef.current = pathname ?? "/";
  const currentPath = useCallback(() => pathRef.current, []);
  const navigate = useCallback((href: string) => router.push(href), [router]);
  const { loggedInUser } = useLoggedInUser();

  const { entry } = useActivePageContext();
  const [contextName, setContextName] = useState<string | undefined>();
  const pageContext = usePageContextString(contextName);

  const [chatId, setChatId] = useState(draftUid);
  const startNewChat = useCallback(() => setChatId(draftUid()), []);
  // The MSP tenant is part of the key: a chat that outlived a tenant switch
  // would carry one tenant's reads and names into questions about another.
  const { globalApiParams } = useApplicationContext();
  const tenant = globalApiParams?.account;
  const conversationId = tenant ? `${tenant}:${chatId}` : chatId;

  // Focus moves a frame after opening: an inert subtree cannot take it.
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("textarea, [role='alertdialog']")
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!available || !headers) return null;

  return (
    <aside
      ref={panelRef}
      // Read by the dashboard's modals.
      data-assistant-panel={open ? "open" : "closed"}
      aria-label="NetBird Assistant"
      aria-hidden={!open}
      // The panel stays mounted, so without inert it stays in the tab order while hidden.
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
        extraExecutors={EXTRA_EXECUTORS}
        fetchManagement={fetchManagement}
        conversationId={conversationId}
      >
        {entry && <ContextName entry={entry} onName={setContextName} />}

        <ConversationRuntime open={open}>
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
                {PANEL_ON_LEFT ? (
                  <PanelLeft size={17} />
                ) : (
                  <PanelRight size={17} />
                )}
              </PanelButton>

              <span className="min-w-0 truncate text-sm font-medium text-nb-gray-100">
                Assistant
              </span>

              <div className="ml-auto flex shrink-0 items-center gap-1">
                <NewChatButton onNewChat={startNewChat} />
              </div>
            </header>

            <AssistantConversation onNewChat={startNewChat} />
          </div>
        </ConversationRuntime>
      </AssistantProvider>
    </aside>
  );
}

export default AssistantChatPanel;
