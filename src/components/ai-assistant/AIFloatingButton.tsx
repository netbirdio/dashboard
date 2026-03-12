"use client";

import { cn } from "@utils/helpers";
import { MessageCircleQuestion, X } from "lucide-react";
import React from "react";

type Props = {
  isOpen: boolean;
  onClick: () => void;
};

export default function AIFloatingButton({ isOpen, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-5 right-5 z-[9997] w-12 h-12 rounded-full",
        "flex items-center justify-center",
        "shadow-lg transition-all duration-200 cursor-pointer",
        "hover:scale-105 active:scale-95",
        isOpen
          ? "bg-nb-gray-800 text-nb-gray-400 hover:text-white"
          : "bg-gradient-to-br from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400",
      )}
    >
      {isOpen ? <X size={20} /> : <MessageCircleQuestion size={22} />}
    </button>
  );
}