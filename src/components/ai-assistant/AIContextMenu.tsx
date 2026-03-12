"use client";

import { cn } from "@utils/helpers";
import { MessageCircleQuestion, Sparkles } from "lucide-react";
import React, { forwardRef } from "react";

type Props = {
  x: number;
  y: number;
  selectedText: string;
  onExplain: () => void;
  onClose: () => void;
};

const AIContextMenu = forwardRef<HTMLDivElement, Props>(
  ({ x, y, selectedText, onExplain, onClose }, ref) => {
    // Adjust position to stay within viewport
    const adjustedX = Math.min(x, window.innerWidth - 220);
    const adjustedY = Math.min(y, window.innerHeight - 100);

    const truncatedText =
      selectedText.length > 40
        ? selectedText.slice(0, 40) + "..."
        : selectedText;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed z-[9999] min-w-[200px] rounded-lg border",
          "border-nb-gray-900 bg-nb-gray-940 shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-100",
          "py-1",
        )}
        style={{ left: adjustedX, top: adjustedY }}
      >
        <div className="px-3 py-1.5 border-b border-nb-gray-900">
          <div className="flex items-center gap-1.5 text-[11px] text-nb-gray-500 font-medium uppercase tracking-wider">
            <Sparkles size={12} className="text-yellow-400" />
            AI Assistant
          </div>
        </div>

        <button
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-nb-gray-300",
            "hover:bg-nb-gray-900 hover:text-white transition-colors cursor-pointer",
            "outline-none",
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onExplain();
          }}
        >
          <MessageCircleQuestion size={15} className="text-yellow-400 shrink-0" />
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Explain</span>
            <span className="text-[11px] text-nb-gray-500 leading-tight truncate max-w-[160px]">
              &quot;{truncatedText}&quot;
            </span>
          </div>
        </button>
      </div>
    );
  },
);

AIContextMenu.displayName = "AIContextMenu";
export default AIContextMenu;