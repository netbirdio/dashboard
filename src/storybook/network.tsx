import { screen, userEvent, waitFor } from "storybook/test";
import { settle } from "@/storybook/wait";

/* Radix modals set `pointer-events: none` on everything behind them, which
   user-event refuses to click through by default; nested pickers inside a
   modal still need real pointer events to open. */
export const user = userEvent.setup({ pointerEventsCheck: 0 });

const TIMEOUT = { timeout: 15000 };

export const findText = (text: string | RegExp) =>
  screen.findAllByText(text, undefined, TIMEOUT).then((all) => all[0]);

export const clickText = async (text: string | RegExp) =>
  user.click(await findText(text));

export const findDialog = () => screen.findByRole("dialog", undefined, TIMEOUT);

/** Waits for an element matched by a CSS selector anywhere in the document. */
export const findSelector = async <T extends Element = HTMLElement>(
  selector: string,
) => {
  let found: T | null = null;
  await waitFor(() => {
    found = document.querySelector<T>(selector);
    if (!found) throw new Error(`${selector} not found`);
  }, TIMEOUT);
  return found as unknown as T;
};

export const clickSelector = async (selector: string) =>
  user.click(await findSelector(selector));

/** The table row containing the given text. */
export const findRow = async (text: string | RegExp) => {
  const cell = await findText(text);
  const row = cell.closest("tr");
  if (!row) throw new Error(`No row for ${text}`);
  return row as HTMLTableRowElement;
};

/** Marks the row for the `capture-hover` / `capture-focus` extra shots. */
export const markRow = async (text: string | RegExp) => {
  (await findRow(text)).setAttribute("data-capture", "");
};

export const clickTab = async (name: string | RegExp) =>
  user.click(await screen.findByRole("tab", { name }, TIMEOUT));

/** Waits until a Radix popover, select or menu has rendered its content. */
export const waitForPopup = (
  role: "listbox" | "menu" | "dialog" | "tooltip" = "dialog",
) => screen.findAllByRole(role, undefined, TIMEOUT);

/* The table refresh button spins its icon once on mount with framer-motion,
   which runs on the real clock rather than the frozen one, so shots taken
   right after a fast play function catch it at random angles. The spin
   lasts 0.8s. */
export const settleMotion = () => settle(1000);
