/**
 * The assistant side panel — the base layer of the dashboard.
 *
 * The panel is always mounted, pinned full-height to the right edge, *behind* the
 * dashboard card. Opening doesn't mount or slide anything: the card shrinks and
 * the panel is simply revealed underneath. Two things fall out of that:
 *
 *  - The conversation survives closing for free. There's no unmount, so no need
 *    to hoist the runtime above a popover the way the old floating modal did.
 *  - Because it's always in the DOM, it has to be explicitly removed from the
 *    accessibility tree and tab order while hidden (`inert` + `aria-hidden`),
 *    or keyboard users would tab into an invisible panel.
 *
 * This component owns everything that outlives a single conversation: the chat
 * list and the resolved model. Only one conversation is mounted at a time — switching chats remounts `AssistantConversation` with a different
 * `key` and replays that chat's saved transcript into the fresh runtime.
 */
"use client";

import {
  AssistantRuntimeProvider,
  type ExportedMessageRepository,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useNetBirdFetch } from "@utils/api";
import { cn } from "@utils/helpers";
import { History, PanelLeft, PanelRight, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchModels } from "./assistantApi";
import loadAssistantConfig from "./assistantConfig";
import {
  CARD_INSET,
  CHAT_PAD,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
  useAssistantPanel,
} from "./AssistantPanelContext";
import { AssistantThread } from "./components/AssistantThread";
import type { AssistantQuestion } from "./components/QuestionCard";
import {
  type AssistantContextEntry,
  useActiveAssistantContext,
} from "./context/AssistantContextProvider";
import { describeContext } from "./context/describeContext";
import { useContextChip } from "./context/useContextLabel";
import { ResourceStore } from "./data/resourceStore";
import { ChatHistory } from "./history/ChatHistory";
import { Redactor } from "./privacy/redaction";
import { RedactorProvider } from "./privacy/RedactorContext";
import { useNameCatalog } from "./privacy/useNameCatalog";
import { useAssistantRuntime } from "./runtime/useAssistantRuntime";
import type { ToolSession } from "./tools/useToolExecutor";

/** iOS-style push: fast out of the gate, settling rather than braking. */
const PUSH_EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

const UNTITLED = "New Chat";

/**
 * Chat history is off for now: kept wired rather than deleted, since it's only
 * the launcher and the overlay that are hidden — switching chats, the per-chat
 * transcripts and `ChatHistory` itself all still work.
 */
const SHOW_HISTORY = false;

interface Chat {
  id: string;
  /** First thing the user asked, or `UNTITLED` until they've asked anything. */
  title: string;
  updatedAt: number;
  /**
   * Placeholder mapping + fetched rows for this conversation. Owned here rather
   * than by the conversation component: the transcript is full of `{PEER_1}`
   * tokens, so a chat reopened without its redactor would render as gibberish.
   */
  session: ToolSession;
  /** Transcript, saved when the conversation is unmounted (chat switch). */
  snapshot?: ExportedMessageRepository;
}

const createChat = (): Chat => ({
  id: crypto.randomUUID(),
  title: UNTITLED,
  updatedAt: Date.now(),
  session: { redactor: new Redactor(), resources: new ResourceStore() },
});

/** A chat nobody has said anything in yet — reused instead of piling up. */
const isEmpty = (chat: Chat) => chat.title === UNTITLED && !chat.snapshot;

interface ConversationProps {
  chat: Chat;
  model?: string;
  onSave: (id: string, patch: Partial<Chat>) => void;
}

/** One conversation. Remounted via `key` to switch chats or start a new one. */
function AssistantConversation({ chat, model, onSave }: ConversationProps) {
  const [question, setQuestion] = useState<AssistantQuestion | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const dismissQuestion = useCallback(() => setQuestion(null), []);

  const { entry, dismiss } = useActiveAssistantContext();

  /*
    Read through a ref at send time, not captured: the runtime is built once
    per conversation, and the user can walk around the dashboard between two
    messages in the same chat.
  */
  const contextRef = useRef<{
    entry: typeof entry;
    name: string | undefined;
  }>({ entry: null, name: undefined });

  const pageContext = useCallback(
    () =>
      describeContext(
        contextRef.current.entry,
        chat.session.redactor,
        contextRef.current.name,
      ),
    [chat.session.redactor],
  );

  const runtime = useAssistantRuntime({
    session: chat.session,
    model,
    onQuestion: setQuestion,
    onStatus: setStatus,
    pageContext,
    nameCatalog: useNameCatalog(),
  });

  // Everything below reads the *current* chat and callbacks from refs: the
  // effect that saves the transcript must run exactly once, on unmount, and
  // depending on those values directly would make it save-and-resubscribe on
  // every render instead.
  const chatRef = useRef(chat);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    chatRef.current = chat;
    onSaveRef.current = onSave;
  });

  const importedRef = useRef(false);

  useEffect(() => {
    const { id, snapshot } = chatRef.current;
    // Guarded rather than relying on the effect running once: if the runtime
    // instance were ever replaced, re-importing would duplicate the transcript.
    if (snapshot && !importedRef.current) {
      importedRef.current = true;
      runtime.thread.import(snapshot);
    }

    let title = chatRef.current.title;
    const unsubscribe = runtime.thread.subscribe(() => {
      const next = deriveTitle(runtime.thread.getState().messages);
      // Only the title is pushed up live (it's what the chat list shows, and
      // it's a string compare). The transcript is exported once, below.
      if (next && next !== title) {
        title = next;
        onSaveRef.current(id, { title, updatedAt: Date.now() });
      }
    });

    return () => {
      unsubscribe();
      onSaveRef.current(id, {
        title,
        snapshot: runtime.thread.export(),
        updatedAt: Date.now(),
      });
    };
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <RedactorProvider value={chat.session}>
        {entry && <ContextName entry={entry} contextRef={contextRef} />}
        <AssistantThread
          question={question}
          onDismissQuestion={dismissQuestion}
          status={status}
          context={entry}
          onDismissContext={dismiss}
        />
      </RedactorProvider>
    </AssistantRuntimeProvider>
  );
}

/**
 * Keeps the sendable form of the context next to the entry.
 *
 * Renders nothing: the name comes from a hook (the SWR cache), and the runtime
 * needs it as a plain value at send time. Mounted only while there *is* a
 * context, so the lookup costs nothing the rest of the time.
 */
function ContextName({
  entry,
  contextRef,
}: {
  entry: AssistantContextEntry;
  contextRef: React.MutableRefObject<{
    entry: AssistantContextEntry | null;
    name: string | undefined;
  }>;
}) {
  const { name } = useContextChip(entry);

  useEffect(() => {
    contextRef.current = { entry, name };
    return () => {
      contextRef.current = { entry: null, name: undefined };
    };
  }, [entry, name, contextRef]);

  return null;
}

/** Chat list label: the first thing the user asked, trimmed to fit the panel. */
function deriveTitle(messages: readonly ThreadMessage[]): string | null {
  const first = messages.find((message) => message.role === "user");
  if (!first) return null;

  const text = first.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
  if (!text) return null;

  return text.length > 60 ? `${text.slice(0, 59)}…` : text;
}

/* The header's outer elements are icon buttons whose 36px hit area already
   carries ~10px of empty space around the glyph, so matching `CHAT_PAD.x`
   would make the header look inset further than the messages below it. */
const HEADER_PAD_X = CHAT_PAD.x - 10;

function PanelButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        // `shrink-0`: it sits in a row with the chat title, and a long title
        // would otherwise squeeze the button narrower than its own icon.
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-nb-gray-900 hover:text-nb-gray-200",
        active ? "bg-nb-gray-900 text-nb-gray-100" : "text-nb-gray-300",
      )}
    >
      {children}
    </button>
  );
}

export function AssistantPanel() {
  const { available, open, setOpen, overlay } = useAssistantPanel();
  const { fetch: authedFetch } = useNetBirdFetch(true);
  const { origin } = useMemo(() => loadAssistantConfig(), []);

  const [chats, setChats] = useState<Chat[]>(() => [createChat()]);
  const [activeId, setActiveId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const [model, setModel] = useState<string | undefined>(undefined);

  const active = chats.find((chat) => chat.id === activeId) ?? chats[0];

  const saveChat = useCallback((id: string, patch: Partial<Chat>) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, ...patch } : chat)),
    );
  }, []);

  const startNewChat = useCallback(() => {
    setHistoryOpen(false);
    // Already sitting in a blank chat — the + would just create a twin of it.
    if (isEmpty(active)) return;

    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
  }, [active]);

  const openChat = useCallback((id: string) => {
    setActiveId(id);
    setHistoryOpen(false);
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== id));
  }, []);

  /*
    Resolved when the panel is shown — it's always mounted, so doing this eagerly
    would cost every page load. Failure is survivable: with no id the server picks
    the model itself.

    On every open, not just the first: the panel outlives deployments, and a
    once-only fetch left it naming a model the server had since dropped — every
    send then failed with "unknown model" until the page was reloaded.
  */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const modelList = await fetchModels(authedFetch, origin).catch(() => []);
      if (cancelled) return;
      setModel(modelList.find((m) => m.default)?.id);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, authedFetch, origin]);

  // The composer's `autoFocus` only fires when it mounts, and the panel is
  // always mounted — so opening has to move focus itself. Deferred a frame: the
  // panel is `inert` while closed, and an inert subtree can't take focus until
  // that attribute is actually off the DOM.
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Reopening the panel should land on the conversation, not on whatever view
  // happened to be showing when it was closed. Adjusted during render (rather
  // than in an effect) so the closing frame already shows the conversation.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setHistoryOpen(false);
  }

  if (!available) return null;

  const otherChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside
      ref={panelRef}
      aria-label="NetBird Assistant"
      aria-hidden={!open}
      // React 19 passes `inert` through as a real attribute. Without it the
      // hidden panel stays in the tab order behind the dashboard card.
      inert={!open ? true : undefined}
      className={cn(
        // Spans the whole viewport, not just the panel column: everything behind
        // the dashboard card is the chat surface, so the margin gap on all four
        // sides reads as one continuous background rather than three edges of
        // page colour and one of chat.
        "fixed inset-0 flex",
        PANEL_ON_LEFT ? "justify-start" : "justify-end",
        // A step lighter than the page (nb-gray-950) so the card reads as lifted
        // off it.
        "bg-nb-gray-925",
        "transition-opacity duration-300 ease-out",
        open ? "opacity-100" : "pointer-events-none opacity-0",
        // Revealed by the card shrinking, so normally underneath it. With no room
        // to reveal, it covers the dashboard instead.
        overlay ? "z-50" : "z-0",
      )}
    >
      {/*
        The chat column itself, pinned to `PANEL_SIDE` so it lands in the strip
        the card uncovers. Full width when there's no room to reveal.
      */}
      {/*
        No padding of its own: the rows inside pad themselves by `CHAT_PAD`, so
        the message viewport can span the column and put its scrollbar on the
        panel's edge rather than `CARD_INSET` inside it.
      */}
      <div
        className="flex min-h-0 flex-col"
        style={{ width: overlay ? "100%" : PANEL_WIDTH }}
      >
        {/*
          Conversation and history share this box. Opening history pushes the
          whole conversation — header included — back: smaller, faded out and
          shifted towards the panel's own edge, with the list sliding over it as
          an inset card, so the two read as one stack rather than two screens.
        */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col transition-[transform,opacity] duration-300",
              PUSH_EASE,
              historyOpen && "pointer-events-none scale-[0.96] opacity-0",
              historyOpen &&
                (PANEL_ON_LEFT ? "-translate-x-8" : "translate-x-8"),
            )}
          >
            <header
              className="flex shrink-0 items-center gap-2 pb-2"
              style={{
                paddingLeft: HEADER_PAD_X,
                paddingRight: HEADER_PAD_X,
                paddingTop: CHAT_PAD.top,
              }}
            >
              <PanelButton
                label="Close assistant"
                onClick={() => setOpen(false)}
              >
                {PANEL_ON_LEFT ? (
                  <PanelLeft size={17} />
                ) : (
                  <PanelRight size={17} />
                )}
              </PanelButton>

              {/* `UNTITLED` until the first question, so a fresh chat reads
                  "New Chat" and an ongoing one names itself. */}
              <span
                className="min-w-0 truncate text-sm font-medium text-nb-gray-100"
                title={active.title}
              >
                {active.title}
              </span>

              <div className="ml-auto flex shrink-0 items-center gap-1">
                <PanelButton label="New Chat" onClick={startNewChat}>
                  <Plus size={18} />
                </PanelButton>
                {SHOW_HISTORY && (
                  <PanelButton
                    label="Chats"
                    active={historyOpen}
                    onClick={() => setHistoryOpen((wasOpen) => !wasOpen)}
                  >
                    <History size={17} />
                  </PanelButton>
                )}
              </div>
            </header>

            <AssistantConversation
              key={active.id}
              chat={active}
              model={model}
              onSave={saveChat}
            />
          </div>

          {SHOW_HISTORY && (
            <div
              aria-hidden={!historyOpen}
              inert={!historyOpen ? true : undefined}
              className={cn(
                // No drop shadow: it would only ever fall outside the box,
                // darkening the gutter instead of the panel.
                "absolute inset-0 overflow-hidden rounded-2xl border border-nb-gray-800 bg-nb-gray-925",
                "transition-transform duration-300",
                PUSH_EASE,
                historyOpen
                  ? "translate-x-0"
                  : PANEL_ON_LEFT
                  ? "-translate-x-[110%]"
                  : "translate-x-[110%]",
              )}
              /*
                This box draws a visible border, so it lands on `CARD_INSET` —
                the dashboard card's own frame — rather than on the chat's text.
              */
              style={
                overlay
                  ? undefined
                  : {
                      top: CARD_INSET,
                      bottom: CARD_INSET,
                      left: CARD_INSET,
                      right: CARD_INSET,
                    }
              }
            >
              <ChatHistory
                chats={otherChats}
                activeId={active.id}
                onSelect={openChat}
                onDelete={deleteChat}
                onClose={() => setHistoryOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default AssistantPanel;
