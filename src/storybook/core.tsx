import type { StoryObj } from "@storybook/nextjs-vite";
import { MotionConfig } from "framer-motion";
import React from "react";
import { screen, userEvent, waitFor } from "storybook/test";
import DialogProvider from "@/contexts/DialogProvider";
import DashboardLayout from "@/layouts/DashboardLayout";

const TIMEOUT = { timeout: 10_000 };

/* The dashboard keeps table filters, search, sorting, pagination, the
   sidebar state and the first-run flag in localStorage. Capture runs many
   stories in one browser context, so a story that changes any of them would
   leak into the next one; clear them before rendering and again when the
   page is left. */
const TRANSIENT_KEYS = /^netbird-(table-|nav-collapsed|first-run|limits-)/;

function clearTransientStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => TRANSIENT_KEYS.test(key))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export function resetStorage() {
  clearTransientStorage();
  window.addEventListener("pagehide", clearTransientStorage);
  return () => {
    window.removeEventListener("pagehide", clearTransientStorage);
    clearTransientStorage();
  };
}

/* DialogProvider normally comes from the root AppLayout; confirm dialogs
   (delete, revoke, disable) need it. framer-motion animates from JS, which
   the capture script cannot finish (e.g. the refresh button spins on mount),
   so motion is turned off to keep screenshots stable. */
export const inLayout = (Page: React.ComponentType) => {
  const Rendered = () => (
    <MotionConfig reducedMotion={"always"}>
      <DialogProvider>
        <DashboardLayout>
          <Page />
        </DashboardLayout>
      </DialogProvider>
    </MotionConfig>
  );
  return Rendered;
};

export const nav = (pathname: string, query?: Record<string, string>) => ({
  nextjs: { navigation: { pathname, query } },
});

/** The first element with the text; tables often repeat a name in several cells. */
export const text = async (matcher: string | RegExp) =>
  (await screen.findAllByText(matcher, {}, TIMEOUT))[0];
export const role = async (r: string, name?: string | RegExp) =>
  (await screen.findAllByRole(r as never, name ? { name } : {}, TIMEOUT))[0];

export async function click(element: Element | Promise<Element>) {
  await userEvent.click(await element);
}

export const clickText = async (matcher: string | RegExp) =>
  click(text(matcher));
export const clickRole = async (r: string, name?: string | RegExp) =>
  click(role(r, name));

/** Waits until a dialog (modal) or menu is open, so the shot shows it. */
export const dialog = () => role("dialog");
export const menu = () => role("menu");

export const until = <T,>(fn: () => T) => waitFor(fn, TIMEOUT);

/** Scrolls wide tables fully to the right, so the action column and its
    menus are inside the 1280px wide screenshot. */
export function revealRight(el: Element) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth) node.scrollLeft = node.scrollWidth;
  }
}

/** Opens a table row's action menu. */
export async function openRowMenu(row: Element) {
  const trigger = row.querySelector("button[aria-haspopup=menu]")!;
  revealRight(trigger);
  await click(trigger);
  await menu();
}

/** Marks an element as the target of the capture-hover / capture-focus shots. */
export const markCapture = (el: Element | null | undefined) =>
  el?.setAttribute("data-capture", "");

/** Stops SVG (SMIL) animations, such as the loading icon, at their first frame. */
export function pauseSvgAnimations() {
  document.querySelectorAll("svg").forEach((svg) => {
    svg.pauseAnimations();
    svg.setCurrentTime(0);
  });
}

export type Story = StoryObj;
