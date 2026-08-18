/**
 * The chat list that slides over the conversation.
 *
 * History is per browser session, not persisted: a transcript holds real peer
 * names, IPs and emails (they're only pseudonymized on the way to the model, and
 * restored for display), so writing it to localStorage would put exactly the data
 * the redaction boundary protects onto disk. Keeping it in memory means switching
 * between chats works for as long as the tab is open, and closing the tab takes
 * the transcripts with it.
 */
"use client";

import { cn } from "@utils/helpers";
import { MessageSquare, Trash2, X } from "lucide-react";

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: number;
}

/** "just now" / "12 min ago" / "3 h ago" — the list only needs a rough ordering cue. */
function relativeTime(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export interface ChatHistoryProps {
  chats: ChatSummary[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function AssistantHistoryPanel({
  chats,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: ChatHistoryProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
        <span className="text-sm font-medium text-nb-gray-100">Chats</span>
        <span className="ml-auto text-[11px] text-nb-gray-600">
          this session only
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chats"
          className="flex h-9 w-9 items-center justify-center rounded-md text-nb-gray-300 transition-colors hover:bg-nb-gray-900 hover:text-nb-gray-200"
        >
          <X size={17} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {chats.length === 0 ? (
          <p className="px-1 py-6 text-xs text-nb-gray-500">
            No other chats yet. Start one with the + button.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {chats.map((chat) => (
              <li key={chat.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  aria-current={chat.id === activeId}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 pr-8 text-left transition-colors",
                    chat.id === activeId
                      ? "bg-netbird-500/15 text-nb-gray-100"
                      : "text-nb-gray-300 hover:bg-nb-gray-900",
                  )}
                >
                  <MessageSquare
                    size={13}
                    className="shrink-0 text-nb-gray-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{chat.title}</span>
                    <span className="block text-[10px] text-nb-gray-600">
                      {relativeTime(chat.updatedAt)}
                    </span>
                  </span>
                </button>

                {/*
                  Deleting the chat you're in would leave the panel with nothing
                  to show, so the active one has no delete affordance — start a
                  new chat first.
                */}
                {chat.id !== activeId && (
                  <button
                    type="button"
                    onClick={() => onDelete(chat.id)}
                    aria-label={`Delete chat "${chat.title}"`}
                    className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-nb-gray-600 opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
