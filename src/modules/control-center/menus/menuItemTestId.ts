// Menu entries carry a stable `cc-menu-<action>` test id derived from the
// label, so e2e never has to match the visible copy.
export const menuItemSlug = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
