import { expect, userEvent, waitFor, within } from "storybook/test";

/* Radix renders dialogs, popovers and menus into document.body, so every
   query runs against the whole document rather than the story canvas. */
export const body = () => within(document.body);

const TIMEOUT = { timeout: 8000 };

export const findText = (text: string | RegExp) =>
  body()
    .findAllByText(text, {}, TIMEOUT)
    .then((all) => all[0]);

export async function click(element: Element | null | undefined) {
  await expect(element).toBeTruthy();
  await userEvent.click(element as Element);
}

export const clickText = async (text: string | RegExp) =>
  click(await findText(text));

export const clickTestId = async (id: string, index = 0) =>
  click((await body().findAllByTestId(id, {}, TIMEOUT))[index]);

export const clickRole = async (
  role: string,
  name: string | RegExp,
  index = 0,
) =>
  click((await body().findAllByRole(role as never, { name }, TIMEOUT))[index]);

/* Popovers such as the cmdk selectors also carry role=dialog, but are not modals. */
const modals = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[role=dialog]")).filter(
    (el) => !el.closest("[data-radix-popper-content-wrapper]"),
  );

/** The topmost open dialog; nested modals stack in DOM order. */
export async function dialog() {
  await waitFor(() => expect(modals().length).toBeGreaterThan(0), TIMEOUT);
  const all = modals();
  return all[all.length - 1];
}

export async function waitForSelector(
  selector: string,
  root: ParentNode = document,
) {
  await waitFor(
    () => expect(root.querySelector(selector)).toBeTruthy(),
    TIMEOUT,
  );
  return root.querySelector(selector) as HTMLElement;
}

/** Waits for the open Radix popover, dropdown or select content. */
export const popover = () =>
  waitForSelector("[data-radix-popper-content-wrapper]");

export const row = (id: string) => waitForSelector(`tr[data-row-id="${id}"]`);

/** Opens the table's filter popover (the first "Filter" button on the page). */
export const openFilters = () => clickRole("button", /filter/i);

export { settle } from "@/storybook/wait";

export async function type(element: Element | null | undefined, text: string) {
  await expect(element).toBeTruthy();
  await userEvent.clear(element as Element);
  await userEvent.type(element as Element, text);
}

/** Waits until `count` dialogs are open, for nested modals. */
export async function dialogCount(count: number) {
  await waitFor(
    () => expect(modals().length).toBeGreaterThanOrEqual(count),
    TIMEOUT,
  );
  return dialog();
}

/** Clicks the first element inside `root` whose text matches, e.g. an option in an open popover. */
export async function clickTextIn(
  root: HTMLElement | Promise<HTMLElement>,
  text: string | RegExp,
) {
  const all = await within(await root).findAllByText(text, {}, TIMEOUT);
  await click(all[0]);
}
