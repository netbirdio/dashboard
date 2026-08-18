// Always mounted so a conversation survives closing; inert + aria-hidden while hidden.
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { PanelLeft, PanelRight, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_PAD,
  type PageContextEntry,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
  type SelectableModel,
} from "@/interfaces/Assistant";
import {
  describePageContext,
  useActivePageContext,
} from "@/modules/assistant/AssistantChatContextProvider";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";
import { useContextChip } from "@/modules/assistant/chat/AssistantContextChip";
import type { AssistantQuestion } from "@/modules/assistant/chat/AssistantQuestionCard";
import { AssistantThread } from "@/modules/assistant/chat/AssistantThread";
import { useAssistantRuntime } from "@/modules/assistant/hooks/useAssistantRuntime";
import {
  ToolResultsProvider,
  ToolResultStore,
} from "@/modules/assistant/hooks/useAssistantTools";

interface ConversationProps {
  toolResults: ToolResultStore;
  model?: string;
}

// One conversation. Remounted via `key` to start a new one.
function AssistantConversation({ toolResults, model }: Readonly<ConversationProps>) {
  const [question, setQuestion] = useState<AssistantQuestion | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [turnActive, setTurnActive] = useState(false);

  const dismissQuestion = useCallback(() => setQuestion(null), []);

  const { entry, dismiss } = useActivePageContext();

  // Read through a ref at send time, not captured: the runtime is built once
  // per conversation, and the user can navigate between two messages.
  const contextRef = useRef<{
    entry: typeof entry;
    name: string | undefined;
  }>({ entry: null, name: undefined });

  const pageContext = useCallback(
    () =>
      describePageContext(contextRef.current.entry, contextRef.current.name),
    [],
  );

  const runtime = useAssistantRuntime({
    toolResults,
    model,
    onQuestion: setQuestion,
    onStatus: setStatus,
    onTurnActive: setTurnActive,
    pageContext,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ToolResultsProvider value={toolResults}>
        {entry && <ContextName entry={entry} contextRef={contextRef} />}
        <AssistantThread
          question={question}
          onDismissQuestion={dismissQuestion}
          status={status}
          turnActive={turnActive}
          context={entry}
          onDismissContext={dismiss}
        />
      </ToolResultsProvider>
    </AssistantRuntimeProvider>
  );
}

// Renders nothing: the context's display name comes from a hook (the SWR
// cache), but the runtime needs it as a plain value at send time.
function ContextName({
  entry,
  contextRef,
}: Readonly<{
  entry: PageContextEntry;
  contextRef: React.MutableRefObject<{
    entry: PageContextEntry | null;
    name: string | undefined;
  }>;
}>) {
  const { name } = useContextChip(entry);

  useEffect(() => {
    contextRef.current = { entry, name };
    return () => {
      contextRef.current = { entry: null, name: undefined };
    };
  }, [entry, name, contextRef]);

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

export function AssistantChatPanel() {
  const { available, open, setOpen, overlay, origin } = useAssistantSidebar();

  // Per-conversation fetched rows. A new store is a new conversation.
  const [chat, setChat] = useState(() => ({
    id: crypto.randomUUID(),
    toolResults: new ToolResultStore(),
  }));

  // Fetched on every open, not once: the panel outlives deployments and a stale
  // model id makes every send fail. With no id the server picks the model itself.
  const { data: modelList } = useFetchApi<{ models: SelectableModel[] }>(
    "/v1/models",
    true,
    true,
    available && open,
    { origin },
  );
  const model = modelList?.models?.find((m) => m.default)?.id;

  const startNewChat = useCallback(
    () => setChat({ id: crypto.randomUUID(), toolResults: new ToolResultStore() }),
    [],
  );

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
            <PanelButton label="New Chat" onClick={startNewChat}>
              <Plus size={18} />
            </PanelButton>
          </div>
        </header>

        <AssistantConversation
          key={chat.id}
          toolResults={chat.toolResults}
          model={model}
        />
      </div>
    </aside>
  );
}

export default AssistantChatPanel;
