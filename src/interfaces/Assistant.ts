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

type PanelSide = "left" | "right";

const PANEL_SIDE: PanelSide = "right";

// The cast is needed: TypeScript narrows the const to its initialiser
// and rejects a plain comparison as one that can never hold.
export const PANEL_ON_LEFT = (PANEL_SIDE as PanelSide) === "left";

export const PANEL_WIDTH = 520;

export const CARD_INSET = 18;

// Must match the card's `border` and `rounded-2xl` in DashboardLayout.
export const CARD_BORDER = 1;
export const CARD_RADIUS = "1rem";

export const CHAT_PAD = { x: 22, top: 18, bottom: 19 };
