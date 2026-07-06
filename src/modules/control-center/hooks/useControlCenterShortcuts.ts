import { useEffect, useRef } from "react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

type ShortcutMap = Record<string, () => void>;

const INTERACTIVE_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "OPTION",
  "DETAILS",
  "SUMMARY",
]);

export function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement;
  if (!el) return false;
  if (INTERACTIVE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  if (el.closest("[role='dialog']") || el.closest("[role='alertdialog']"))
    return true;
  return false;
}

/**
 * Registers keyboard shortcuts that are only active in draft mode.
 * Automatically ignores keypresses when an input is focused.
 * Uses a ref internally so the shortcuts map doesn't need to be memoized by the caller.
 */
export function useControlCenterShortcuts(
  shortcuts: ShortcutMap,
  enabled: boolean = true,
) {
  const { isDraft } = useDraftMode();
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!isDraft || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      // Check exact key first (for special keys like Delete, Escape, +, -)
      // then check lowercase (for letter keys, case-insensitive)
      const handler =
        shortcutsRef.current[e.key] ??
        shortcutsRef.current[e.key.toLowerCase()];
      if (handler) {
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDraft, enabled]);
}
