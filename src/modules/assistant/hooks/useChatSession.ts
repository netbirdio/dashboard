"use client";

import type { MessageStreamEvent } from "eve/client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChatSession, type ChatSnapshot, type StoredSession } from "../lib/chat-session";

interface UseChatSessionOptions {
  host: string;
  headers: () => Promise<Record<string, string>>;
  /** Read on mount only. */
  initialSession?: StoredSession;
  onEvent?: (event: MessageStreamEvent) => void;
  onSessionChange?: (session: StoredSession | undefined) => void;
}

export interface UseChatSessionResult extends ChatSnapshot {
  send: ChatSession["send"];
  prewarm: ChatSession["prewarm"];
  respond: ChatSession["respond"];
  cancel: ChatSession["cancel"];
  reset: ChatSession["reset"];
}

export function useChatSession(options: UseChatSessionOptions): UseChatSessionResult {
  const latest = useRef(options);
  latest.current = options;

  const [chat] = useState(
    () => new ChatSession({ host: options.host, headers: () => latest.current.headers() }, options.initialSession),
  );
  chat.setCallbacks({
    onEvent: (event) => latest.current.onEvent?.(event),
    onSessionChange: (session) => latest.current.onSessionChange?.(session),
  });

  useEffect(() => {
    chat.start();
    return () => chat.stop();
  }, [chat]);

  const snapshot = useSyncExternalStore(chat.subscribe, chat.getSnapshot, chat.getSnapshot);
  const [actions] = useState(() => ({
    send: chat.send.bind(chat),
    prewarm: chat.prewarm.bind(chat),
    respond: chat.respond.bind(chat),
    cancel: chat.cancel.bind(chat),
    reset: chat.reset.bind(chat),
  }));
  return { ...snapshot, ...actions };
}
