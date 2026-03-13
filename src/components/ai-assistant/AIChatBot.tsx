"use client";

import { cn } from "@utils/helpers";
import {
  Bot,
  MessageCircleQuestion,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant" | "context";
  content: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
};

const AI_SERVER_URL =
  process.env.NEXT_PUBLIC_AI_SERVER_URL || "http://localhost:3080";
const AI_API_KEY =
  process.env.NEXT_PUBLIC_AI_API_KEY || "nb-ai-dev-key-change-me";

async function fetchAIResponse(messages: Message[]): Promise<string> {
  const response = await fetch(`${AI_SERVER_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.reply;
}

export default function AIChatBot({ open, onClose, initialQuery }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasProcessedInitialQuery = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const getAIResponse = useCallback(async (allMessages: Message[]) => {
    setIsTyping(true);
    try {
      const reply = await fetchAIResponse(allMessages);
      const response: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: reply,
      };
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error";
      const response: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Sorry, I couldn't get a response. Error: ${errorMsg}`,
      };
      setMessages((prev) => [...prev, response]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  // Handle initial query from explain mode
  useEffect(() => {
    if (open && initialQuery && !hasProcessedInitialQuery.current) {
      hasProcessedInitialQuery.current = true;

      // Parse structured query: "Explain "X" on Y modal in Z\nDocs: ..."
      const lines = initialQuery.split("\n");
      const userMessage = lines[0];
      const docsLine = lines.find((l) => l.startsWith("Docs: "));

      const msgs: Message[] = [];

      if (docsLine) {
        msgs.push({
          id: Date.now().toString() + "-ctx",
          role: "context",
          content: docsLine,
        });
      }

      msgs.push({
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
      });

      setMessages(msgs);
      getAIResponse(msgs);
    }
  }, [open, initialQuery, getAIResponse]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      hasProcessedInitialQuery.current = false;
      setMessages([]);
      setInput("");
      setIsTyping(false);
      abortControllerRef.current?.abort();
    }
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    getAIResponse(updatedMessages);
  }, [input, isTyping, messages, getAIResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-5 z-[9998] w-[420px] h-[600px]",
        "flex flex-col rounded-xl border border-nb-gray-900 bg-nb-gray-950 shadow-2xl",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-nb-gray-900">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-400/20">
            <Sparkles size={15} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-none">
              NetBird AI Assistant
            </h3>
            <span className="text-[11px] text-nb-gray-500">
              Ask anything about NetBird
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-nb-gray-500 hover:text-white hover:bg-nb-gray-900 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
            <MessageCircleQuestion
              size={40}
              className="text-nb-gray-500"
            />
            <div>
              <p className="text-sm text-nb-gray-400 font-medium">
                How can I help?
              </p>
              <p className="text-xs text-nb-gray-500 mt-1">
                Use the Explain button to click on any element, or ask a
                question below.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "context" ? (
            <div key={msg.id} className="flex justify-center">
              <div className="text-[11px] text-nb-gray-500 bg-nb-gray-900/50 rounded-full px-3 py-1 flex items-center gap-1.5">
                <Sparkles size={10} className="text-yellow-500/60" />
                {msg.content}
              </div>
            </div>
          ) : (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2.5",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-gradient-to-br from-yellow-400/20 to-orange-400/20 flex items-center justify-center mt-0.5">
                  <Bot size={13} className="text-yellow-400" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-nb-gray-900/80 text-nb-gray-200",
                )}
              >
                {msg.content.split("\n").map((line, i) => (
                  <React.Fragment key={i}>
                    {line
                      .split(/(\*\*[^*]+\*\*)/)
                      .map((part, j) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong
                            key={j}
                            className="font-semibold text-white"
                          >
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          <React.Fragment key={j}>{part}</React.Fragment>
                        ),
                      )}
                    {i < msg.content.split("\n").length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-600/30 flex items-center justify-center mt-0.5">
                  <User size={13} className="text-indigo-300" />
                </div>
              )}
            </div>
          ),
        )}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-gradient-to-br from-yellow-400/20 to-orange-400/20 flex items-center justify-center mt-0.5">
              <Bot size={13} className="text-yellow-400" />
            </div>
            <div className="bg-nb-gray-900/80 rounded-lg px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-nb-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-nb-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-nb-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-nb-gray-900">
        <div className="flex items-center gap-2 bg-nb-gray-900/60 rounded-lg px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            className="flex-1 bg-transparent text-sm text-white placeholder-nb-gray-500 outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              input.trim() && !isTyping
                ? "text-yellow-400 hover:bg-nb-gray-800 cursor-pointer"
                : "text-nb-gray-600 cursor-not-allowed",
            )}
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-nb-gray-600 mt-1.5 text-center">
          AI-powered assistant
        </p>
      </div>
    </div>
  );
}