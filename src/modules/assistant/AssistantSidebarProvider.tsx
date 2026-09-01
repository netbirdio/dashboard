"use client";

import { useAssistantAvailable } from "@netbird/assistant-react";
import loadConfig from "@utils/config";
import { useIsMd } from "@utils/responsive";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import {
  CARD_BORDER,
  CARD_INSET,
  CARD_RADIUS,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
} from "@/interfaces/Assistant";

interface AssistantSidebarState {
  // Configured *and* the server answered; false leaves no trace in the UI.
  available: boolean;
  // Empty when none is configured.
  origin: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  overlay: boolean;
  reveal: boolean;
  inset: number;
}

const AssistantSidebarContext = createContext<AssistantSidebarState | null>(
  null,
);

export function AssistantSidebarProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [open, setOpenState] = useState(false);
  const origin = useMemo(() => loadConfig().assistantApiOrigin, []);
  // A configured origin isn't enough — the SDK probes the service's public
  // health route, with focus/reconnect revalidation for long-lived tabs.
  const reachable = useAssistantAvailable(origin);
  const hasRoomToReveal = useIsMd();
  const overlay = !hasRoomToReveal;

  const { isNavigationCollapsed, toggleNavigation } = useApplicationContext();

  // Whether *we* collapsed the sidebar. The collapse state is persisted, so
  // restoring it unconditionally on close would overwrite the user's preference.
  const collapsedByPanel = useRef(false);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);

      // In overlay mode the dashboard is covered anyway, so there's no space
      // to reclaim by collapsing the sidebar.
      if (overlay) return;

      if (next && !isNavigationCollapsed) {
        toggleNavigation();
        collapsedByPanel.current = true;
      } else if (!next && collapsedByPanel.current) {
        if (isNavigationCollapsed) toggleNavigation();
        collapsedByPanel.current = false;
      }
    },
    [overlay, isNavigationCollapsed, toggleNavigation],
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const value = useMemo(() => {
    const reveal = open && !overlay;
    return {
      // A server that dies mid-conversation shouldn't make an open panel
      // vanish along with the transcript.
      available: reachable || open,
      origin,
      open,
      setOpen,
      toggle,
      overlay,
      reveal,
      inset: reveal ? CARD_INSET : 0,
    };
  }, [open, setOpen, toggle, overlay, reachable, origin]);

  useEffect(() => {
    const root = document.documentElement;
    const edge = CARD_INSET + CARD_BORDER;
    const box = value.reveal
      ? {
          top: `${edge}px`,
          bottom: `${edge}px`,
          left: PANEL_ON_LEFT ? `${PANEL_WIDTH + CARD_BORDER}px` : `${edge}px`,
          right: PANEL_ON_LEFT ? `${edge}px` : `${PANEL_WIDTH + CARD_BORDER}px`,
          radius: `calc(${CARD_RADIUS} - ${CARD_BORDER}px)`,
        }
      : {
          top: "0px",
          bottom: "0px",
          left: "0px",
          right: "0px",
          radius: "0px",
        };
    for (const [side, px] of Object.entries(box))
      root.style.setProperty(`--nb-overlay-${side}`, px);
  }, [value.reveal]);

  return (
    <AssistantSidebarContext.Provider value={value}>
      {children}
    </AssistantSidebarContext.Provider>
  );
}

// Returns an unavailable, closed, inert state outside the provider so the
// header can render on surfaces (login, setup) that don't mount the assistant.
export function useAssistantSidebar(): AssistantSidebarState {
  return (
    useContext(AssistantSidebarContext) ?? {
      available: false,
      origin: "",
      open: false,
      setOpen: () => {},
      toggle: () => {},
      overlay: false,
      reveal: false,
      inset: 0,
    }
  );
}
