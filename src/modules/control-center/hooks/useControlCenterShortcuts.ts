import { useEffect, useRef } from "react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

type ShortcutMap = Record<string, () => void>;

// Focused buttons must not block shortcuts: a click leaves the button focused,
// so hotkeys would go dead after any button press.
const TEXT_ENTRY_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement;
  if (!el) return false;
  if (TEXT_ENTRY_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  if (el.closest("[role='dialog']") || el.closest("[role='alertdialog']"))
    return true;
  return false;
}

// Reads the map through a ref so callers needn't memoize it.
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

      // Alt combos take priority and match on e.code, since Option+digit types
      // special characters on macOS.
      const lower = e.key.toLowerCase();
      const codeKey = e.code?.startsWith("Digit")
        ? e.code.slice(5)
        : e.code?.startsWith("Key")
        ? e.code.slice(3).toLowerCase()
        : undefined;
      const handler =
        (e.altKey &&
          (shortcutsRef.current[`alt+${lower}`] ||
            (codeKey && shortcutsRef.current[`alt+${codeKey}`]))) ||
        (!e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          (shortcutsRef.current[e.key] || shortcutsRef.current[lower]));
      if (handler) {
        // A handler may move focus into an input, and without this the pressed
        // key would be typed there.
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDraft, enabled]);
}
