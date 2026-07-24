import React, { useEffect, useRef, useState } from "react";

interface Props {
  onCtrlAltDel?: () => void;
  onPaste?: () => void;
  showRemoteCursor: boolean;
  onToggleRemoteCursor?: (enable: boolean) => void;
  // viewOnly hides input actions and shows a "View-only" badge.
  viewOnly?: boolean;
}

const STORAGE_KEY = "netbird.vnc.toolbarX";

export default function VNCToolbar({
  onCtrlAltDel,
  onPaste,
  showRemoteCursor,
  onToggleRemoteCursor,
  viewOnly,
}: Props) {
  const [xPercent, setXPercent] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? parseFloat(stored) : NaN;
      return isFinite(parsed) ? Math.max(5, Math.min(95, parsed)) : 50;
    } catch (e) {
      return 50;
    }
  });
  const draggingRef = useRef(false);
  const xPercentRef = useRef(xPercent);
  xPercentRef.current = xPercent;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      const clamped = Math.max(5, Math.min(95, pct));
      setXPercent(clamped);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem(STORAGE_KEY, String(xPercentRef.current));
      } catch (e) {}
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // If we unmount mid-drag, undo the body-wide selection lock so the
      // rest of the app doesn't get stuck with text selection disabled.
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
  };

  return (
    <div
      className="fixed top-0 z-50 group px-4 pt-0 pb-4"
      style={{ left: `${xPercent}%`, transform: "translateX(-50%)" }}
    >
      <div
        onPointerDown={startDrag}
        className="h-2 w-24 bg-nb-gray-500/60 group-hover:bg-nb-gray-400/80 rounded-b-lg mx-auto cursor-grab active:cursor-grabbing transition-colors touch-none"
        title="Drag to reposition"
      />
      <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-200 ease-out">
        <div className="flex gap-1 bg-nb-gray-900/95 backdrop-blur border border-nb-gray-700 rounded-md px-2 py-1.5 shadow-lg mt-1">
          {viewOnly && (
            <span
              className="text-xs text-amber-300 px-3 py-1 rounded bg-amber-900/40 border border-amber-700/60 whitespace-nowrap"
              title="The host granted view-only access. You can see the screen but cannot send input."
            >
              View-only
            </span>
          )}
          {onCtrlAltDel && !viewOnly && (
            <button
              onClick={onCtrlAltDel}
              className="text-xs text-nb-gray-300 hover:text-white px-3 py-1 rounded hover:bg-nb-gray-700 transition-colors whitespace-nowrap"
              title="Send Ctrl+Alt+Del to remote machine"
            >
              Ctrl+Alt+Del
            </button>
          )}
          {onPaste && (
            <button
              onClick={onPaste}
              className="text-xs text-nb-gray-300 hover:text-white px-3 py-1 rounded hover:bg-nb-gray-700 transition-colors whitespace-nowrap"
              title="Paste host clipboard into remote machine by typing the text (works on login screens too)"
            >
              Paste
            </button>
          )}
          {onToggleRemoteCursor && (
            <button
              onClick={() => onToggleRemoteCursor(!showRemoteCursor)}
              className={
                "text-xs px-3 py-1 rounded transition-colors whitespace-nowrap " +
                (showRemoteCursor
                  ? "text-white bg-nb-gray-700"
                  : "text-nb-gray-300 hover:text-white hover:bg-nb-gray-700")
              }
              title="Show the remote user's cursor (useful for remote support and view-only scenarios)"
            >
              Remote cursor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
