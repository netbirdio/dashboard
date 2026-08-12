// Context-menu entries are identified in e2e by a stable `cc-menu-<action>` /
// `cc-canvas-menu-<action>` test id derived from the label, so tests never have
// to match the visible copy.
export const menuItemSlug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
