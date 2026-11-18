"use client";

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
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  CARD_BORDER,
  CARD_INSET,
  CARD_RADIUS,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
} from "@/interfaces/Assistant";
import { useAssistantAvailable } from "@/modules/assistant/hooks/useAssistantAvailable";
import { useAssistantHeaders } from "@/modules/assistant/useAssistantHeaders";

interface AssistantSidebarState {
  available: boolean;
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
  const [open, setOpen] = useState(false);
  const origin = useMemo(() => loadConfig().assistantApiOrigin, []);
  const headers = useAssistantHeaders();
  const { isRestricted } = usePermissions();
  const reachable = useAssistantAvailable(
    origin,
    isRestricted ? undefined : headers,
  );
  const hasRoomToReveal = useIsMd();
  const overlay = !hasRoomToReveal;

  const { isNavigationCollapsed, toggleNavigation } = useApplicationContext();

  // The collapse state is persisted, so only a collapse the panel made is
  // restored on close.
  const collapsedByPanel = useRef(false);

  useEffect(() => {
    if (!isNavigationCollapsed) collapsedByPanel.current = false;
  }, [isNavigationCollapsed]);

  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);

      if (next && !isNavigationCollapsed) {
        if (overlay) return;
        toggleNavigation();
        collapsedByPanel.current = true;
      } else if (!next && collapsedByPanel.current) {
        if (isNavigationCollapsed) toggleNavigation();
        collapsedByPanel.current = false;
      }
    },
    [overlay, isNavigationCollapsed, toggleNavigation],
  );

  const navigationRef = useRef({ isNavigationCollapsed, toggleNavigation });
  useEffect(() => {
    navigationRef.current = { isNavigationCollapsed, toggleNavigation };
  }, [isNavigationCollapsed, toggleNavigation]);

  useEffect(() => {
    const restore = () => {
      if (!collapsedByPanel.current) return;
      collapsedByPanel.current = false;
      const navigation = navigationRef.current;
      if (navigation.isNavigationCollapsed) navigation.toggleNavigation();
    };
    globalThis.addEventListener("pagehide", restore);
    return () => {
      globalThis.removeEventListener("pagehide", restore);
      restore();
    };
  }, []);

  const toggle = useCallback(() => changeOpen(!open), [open, changeOpen]);

  const value = useMemo(() => {
    // The layout renders no panel for a restricted user, so nothing may make room for one.
    const reveal = open && !overlay && !isRestricted;
    return {
      // An open panel must not vanish when the server stops answering.
      available: reachable || open,
      origin,
      open,
      setOpen: changeOpen,
      toggle,
      overlay,
      reveal,
      inset: reveal ? CARD_INSET : 0,
    };
  }, [open, changeOpen, toggle, overlay, reachable, origin, isRestricted]);

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
    return () => {
      for (const side of Object.keys(box))
        root.style.removeProperty(`--nb-overlay-${side}`);
    };
  }, [value.reveal]);

  return (
    <AssistantSidebarContext.Provider value={value}>
      {children}
    </AssistantSidebarContext.Provider>
  );
}

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
