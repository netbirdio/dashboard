"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AIChatBot from "./AIChatBot";
import AIFloatingButton from "./AIFloatingButton";

type ExplainContext = {
  modalName: string;
  pageName: string;
  docsUrl: string;
};

type AIAssistantContextType = {
  openChat: (selectedText?: string) => void;
  closeChat: () => void;
  isChatOpen: boolean;
  explainMode: boolean;
  enterExplainMode: () => void;
  exitExplainMode: () => void;
  setExplainContext: (ctx: ExplainContext) => void;
  clearExplainContext: () => void;
};

const AIAssistantContext = createContext<AIAssistantContextType>({
  openChat: () => {},
  closeChat: () => {},
  isChatOpen: false,
  explainMode: false,
  enterExplainMode: () => {},
  exitExplainMode: () => {},
  setExplainContext: () => {},
  clearExplainContext: () => {},
});

export const useAIAssistant = () => useContext(AIAssistantContext);

/**
 * Find the closest ancestor (or self) with a data-explain attribute.
 * Returns null if nothing is explainable.
 */
function findExplainable(el: HTMLElement): HTMLElement | null {
  return el.closest("[data-explain]") as HTMLElement | null;
}

/**
 * Extract a short label from an explainable element by looking for
 * a label, heading, or first bit of text content.
 */
function extractLabel(el: HTMLElement): string {
  const label = el.querySelector("label") as HTMLElement | null;
  if (label?.innerText?.trim()) return label.innerText.trim();

  const heading = el.querySelector("h1, h2, h3, h4") as HTMLElement | null;
  if (heading?.innerText?.trim()) return heading.innerText.trim();

  const text = el.innerText?.trim();
  if (text && text.length <= 80) return text;
  if (text) return text.slice(0, 80) + "...";

  return "this element";
}

function buildQuery(label: string, ctx: ExplainContext | null): string {
  let userMessage = `Explain "${label}"`;
  if (ctx) {
    userMessage += ` on ${ctx.modalName} modal`;
    if (ctx.pageName) userMessage += ` in ${ctx.pageName}`;
  }

  const parts = [userMessage];
  if (ctx?.docsUrl) {
    parts.push(`Docs: ${ctx.docsUrl}`);
  }
  return parts.join("\n");
}

export default function AIAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [explainMode, setExplainMode] = useState(false);
  const [hoveredEl, setHoveredEl] = useState<HTMLElement | null>(null);
  const [explainCtx, setExplainCtx] = useState<ExplainContext | null>(null);

  const openChat = useCallback((selectedText?: string) => {
    setInitialQuery(selectedText || "");
    setIsChatOpen(true);
    setExplainMode(false);
    setHoveredEl(null);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setInitialQuery("");
  }, []);

  const enterExplainMode = useCallback(() => {
    setExplainMode(true);
  }, []);

  const exitExplainMode = useCallback(() => {
    setExplainMode(false);
    setHoveredEl(null);
  }, []);

  const setExplainContext = useCallback((ctx: ExplainContext) => {
    setExplainCtx(ctx);
  }, []);

  const clearExplainContext = useCallback(() => {
    setExplainCtx(null);
  }, []);

  // Explain mode: highlight explainable elements on hover, open chat on click
  useEffect(() => {
    if (!explainMode) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-explain-ignore]") || target.closest("[data-ai-banner]"))
        return;
      const explainable = findExplainable(target);
      setHoveredEl(explainable);
    };

    const handleMouseOut = () => {
      setHoveredEl(null);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-explain-ignore]") || target.closest("[data-ai-banner]"))
        return;

      e.preventDefault();
      e.stopPropagation();

      const explainable = findExplainable(target);
      if (!explainable) return;

      const attrValue = explainable.getAttribute("data-explain") || "";
      const label = (attrValue && attrValue !== "true") ? attrValue : extractLabel(explainable);
      const query = buildQuery(label, explainCtx);
      openChat(query);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitExplainMode();
      }
    };

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [explainMode, explainCtx, openChat, exitExplainMode]);

  // Apply/remove highlight on hovered explainable element via CSS class
  useEffect(() => {
    if (!hoveredEl) return;
    hoveredEl.classList.add("ai-explain-highlight");
    return () => {
      hoveredEl.classList.remove("ai-explain-highlight");
    };
  }, [hoveredEl]);

  // Also clean up all highlights when leaving explain mode
  useEffect(() => {
    if (!explainMode) {
      document.querySelectorAll(".ai-explain-highlight").forEach((el) => {
        el.classList.remove("ai-explain-highlight");
      });
    }
  }, [explainMode]);

  return (
    <AIAssistantContext.Provider
      value={{
        openChat,
        closeChat,
        isChatOpen,
        explainMode,
        enterExplainMode,
        exitExplainMode,
        setExplainContext,
        clearExplainContext,
      }}
    >
      {children}

      {/* Explain mode styles + banner */}
      {explainMode && (
        <style>{`
          .ai-explain-highlight {
            outline: 2px solid rgba(234, 179, 8, 0.7) !important;

            border-radius: 6px;
            cursor: help !important;
            transition: outline 0.1s ease;
          }
        `}</style>
      )}
      {explainMode && (
        <div
          data-ai-banner
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9996] bg-yellow-500/90 text-black text-sm font-medium px-4 py-1.5 rounded-full shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 flex items-center gap-2"
        >
          <span>Click on a highlighted element to explain it</span>
          <button
            onClick={() => exitExplainMode()}
            className="ml-1 text-black/60 hover:text-black underline cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      <AIFloatingButton
        isOpen={isChatOpen}
        onClick={() => {
          if (isChatOpen) {
            closeChat();
          } else {
            openChat();
          }
        }}
      />

      <AIChatBot
        open={isChatOpen}
        onClose={closeChat}
        initialQuery={initialQuery}
      />
    </AIAssistantContext.Provider>
  );
}