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

      // Modifier combos are registered as "ctrl+<key>" / "alt+<key>" /
      // "shift+<key>" and take priority. Plain-key shortcuts never fire while
      // Ctrl/Cmd/Alt is held (so e.g. Ctrl+C copy doesn't toggle the
      // components panel). Alt combos match on e.code (Option+digit types
      // special characters on macOS). Exact key is checked first (Delete,
      // Escape, +, -) then lowercase letters.
      const lower = e.key.toLowerCase();
      const codeKey = e.code?.startsWith("Digit")
        ? e.code.slice(5)
        : e.code?.startsWith("Key")
        ? e.code.slice(3).toLowerCase()
        : undefined;
      const handler =
        (e.ctrlKey && shortcutsRef.current[`ctrl+${lower}`]) ||
        (e.altKey &&
          (shortcutsRef.current[`alt+${lower}`] ||
            (codeKey && shortcutsRef.current[`alt+${codeKey}`]))) ||
        (e.shiftKey && shortcutsRef.current[`shift+${lower}`]) ||
        (!e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          (shortcutsRef.current[e.key] || shortcutsRef.current[lower]));
      if (handler) {
        if (e.ctrlKey || e.shiftKey || e.altKey) e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDraft, enabled]);
}
