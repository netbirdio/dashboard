export interface SelectableModel {
  id: string;
  default: boolean;
}

// What a client-run tool hands back to the model.
export interface ToolOutcome {
  content: string;
  isError: boolean;
}

// Only surfaces with their own URL: a modal covers the panel, so it has no chip.
export type PageContextType =
  | "peer"
  | "group"
  | "network"
  | "user"
  | "settings"
  | "integration";

export interface PageContextEntry {
  key: string;
  type: PageContextType;
  id?: string;
  label?: string;
}

// Panel geometry, shared so the card's margin and the panel's width can't
// drift apart — DashboardLayout and Navigation size themselves from these.
type PanelSide = "left" | "right";

export const PANEL_SIDE: PanelSide = "right";

// Re-asserted rather than compared directly: TypeScript narrows the const to its
// initialiser, so a plain comparison errors as one that can never hold.
export const PANEL_ON_LEFT = (PANEL_SIDE as PanelSide) === "left";

// Panel width, px. The dashboard card's margin is derived from this.
export const PANEL_WIDTH = 520;

// Gap around the dashboard card when the panel is open, px.
export const CARD_INSET = 18;

// The revealed card's own outline (`border` + `rounded-2xl` in DashboardLayout).
// Overlays inset themselves by this so they stop at the card's inner edge.
export const CARD_BORDER = 1;
export const CARD_RADIUS = "1rem";

// Padding the chat's own rows carry, px. The column can't pad instead: that
// would hold the viewport's scrollbar that far inside the panel.
export const CHAT_PAD = { x: 22, top: 18, bottom: 19 };
