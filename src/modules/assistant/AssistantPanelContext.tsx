/**
 * Open/closed state for the assistant side panel.
 *
 * Lives in context because three separate parts of the layout need it: the
 * header's "Agent" button toggles it, the dashboard card shrinks to reveal the
 * panel, and the fixed header has to inset itself by the same amount (it sits
 * outside the card's box, so it can't inherit the margin).
 *
 * The geometry constants live here too, so the card's margin and the panel's
 * width can't drift apart.
 */
"use client";

import { useIsMd } from "@utils/responsive";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useAssistantAvailability } from "./useAssistantAvailability";

/**
 * Which edge the panel occupies. Flip this to move the whole thing: the card's
 * margin, the panel column, the launcher's place in the header and the direction
 * everything slides all derive from it.
 */
type PanelSide = "left" | "right";

export const PANEL_SIDE: PanelSide = "right";

/**
 * Re-asserted rather than compared directly: TypeScript narrows a `const` to its
 * initialiser, so `PANEL_SIDE === "left"` reads as a comparison that can never
 * hold and errors — even though the point of the constant is that it gets edited.
 */
export const PANEL_ON_LEFT = (PANEL_SIDE as PanelSide) === "left";

/** Panel width, px. The dashboard card's margin is derived from this. */
export const PANEL_WIDTH = 520;

/** Gap around the dashboard card when the panel is open, px. */
export const CARD_INSET = 18;

/**
 * Padding the chat's own rows carry, px — the header, the message viewport and
 * the composer bar all use these directly instead of the column padding them.
 *
 * The column can't do it: it would hold the viewport's scrollbar that far inside
 * the panel, and padding on a scroll container doesn't move the scrollbar.
 */
export const CHAT_PAD = { x: 22, top: 18, bottom: 19 };

interface AssistantPanelState {
  /**
   * The assistant is configured *and* its server answered. Both the launcher and
   * the panel render nothing when this is false, so a server that isn't deployed
   * or is down leaves no trace in the UI. Probed once here rather than in each
   * consumer, so they can't disagree about whether the assistant exists.
   */
  available: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /**
   * Narrow viewports can't spare `PANEL_WIDTH`, so there the panel covers the
   * dashboard instead of being revealed beside it. Consumers branch on this
   * rather than each running their own media query, so the card margin, the
   * header inset and the panel's own stacking can't disagree.
   */
  overlay: boolean;
  /** Reveal mode is active: shrink the card and inset the header. */
  reveal: boolean;
  /**
   * Gap the dashboard card is inset by right now (0 when not revealed).
   *
   * Anything computing a height from `100vh` has to subtract `inset * 2`, or it
   * overshoots the card and gets clipped. Exposed here so that maths lives in one
   * place instead of each consumer re-deriving `reveal ? CARD_INSET : 0`.
   */
  inset: number;
}

const AssistantPanelContext = createContext<AssistantPanelState | null>(null);

export function AssistantPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpenState] = useState(false);
  const reachable = useAssistantAvailability();
  const hasRoomToReveal = useIsMd();
  const overlay = !hasRoomToReveal;

  const { isNavigationCollapsed, toggleNavigation } = useApplicationContext();

  /**
   * Whether *we* collapsed the sidebar, as opposed to the user having it
   * collapsed already. The collapse state is persisted to localStorage, so
   * restoring it unconditionally on close would silently overwrite their
   * preference.
   */
  const collapsedByPanel = useRef(false);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);

      // Only meaningful in reveal mode: in overlay mode the dashboard is covered
      // anyway, so there's no space to reclaim and no reason to touch the setting.
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
      // A server that dies mid-conversation shouldn't make an open panel vanish
      // along with the transcript — the chat surfaces its own errors, and the
      // panel disappears once the user closes it.
      available: reachable || open,
      open,
      setOpen,
      toggle,
      overlay,
      reveal,
      inset: reveal ? CARD_INSET : 0,
    };
  }, [open, setOpen, toggle, overlay, reachable]);

  return (
    <AssistantPanelContext.Provider value={value}>
      {children}
    </AssistantPanelContext.Provider>
  );
}

/**
 * Panel state. Returns an unavailable, closed, inert state outside the provider
 * so the header can render on surfaces (login, setup) that don't mount the
 * assistant — there is no panel there to open, so no launcher either.
 */
export function useAssistantPanel(): AssistantPanelState {
  return (
    useContext(AssistantPanelContext) ?? {
      available: false,
      open: false,
      setOpen: () => {},
      toggle: () => {},
      overlay: false,
      reveal: false,
      inset: 0,
    }
  );
}
