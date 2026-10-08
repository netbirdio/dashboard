import type { Decorator } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import DistributorProvider from "@/cloud/distributor/contexts/DistributorProvider";
import MSPProvider from "@/cloud/msp/contexts/MSPProvider";
import AnnouncementProvider from "@/contexts/AnnouncementProvider";
import ApplicationProvider from "@/contexts/ApplicationProvider";
import CountryProvider from "@/contexts/CountryProvider";
import GroupsProvider from "@/contexts/GroupsProvider";
import UsersProvider from "@/contexts/UsersProvider";
import { settle } from "@/storybook/wait";

/* Stories render with `layout: fullscreen`; this gives them breathing room
   and leaves space below for menus and popovers that open downwards. */
export const padded: Decorator = (Story) => (
  <div className={"p-8 pb-[420px]"}>
    <Story />
  </div>
);

/* The provider stack of DashboardLayout without its chrome, for components
   that read groups, users, countries or permissions from context. */
export const withAppProviders: Decorator = (Story) => (
  <ApplicationProvider>
    <DistributorProvider>
      <MSPProvider>
        <UsersProvider>
          <AnnouncementProvider>
            <GroupsProvider>
              <CountryProvider>
                <Story />
              </CountryProvider>
            </GroupsProvider>
          </AnnouncementProvider>
        </UsersProvider>
      </MSPProvider>
    </DistributorProvider>
  </ApplicationProvider>
);

export function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"flex items-start gap-4"}>
      <span className={"w-40 shrink-0 pt-2 text-xs font-mono text-nb-gray-400"}>
        {label}
      </span>
      <div className={className ?? "flex flex-wrap items-center gap-3"}>
        {children}
      </div>
    </div>
  );
}

export function Stack({ children }: { children: React.ReactNode }) {
  return <div className={"flex flex-col gap-5"}>{children}</div>;
}

export function Controlled<T>({
  initial,
  children,
}: {
  initial: T;
  children: (value: T, set: (v: T) => void) => React.ReactNode;
}) {
  const [value, setValue] = React.useState<T>(initial);
  return <>{children(value, setValue)}</>;
}

type PlayCtx = { canvasElement: HTMLElement };

const POPPER = "[data-radix-popper-content-wrapper]";
const DIALOG = "[role=dialog], [role=alertdialog]";

async function find(root: ParentNode, selector: string) {
  let el: HTMLElement | null = null;
  await waitFor(
    () => {
      el = root.querySelector<HTMLElement>(selector);
      expect(el).toBeTruthy();
    },
    { timeout: 5000 },
  );
  return el as unknown as HTMLElement;
}

/* Waits until a portalled overlay (Radix popper content or a dialog) is in
   the document, so the screenshot is taken in the open state. */
export async function waitForOverlay(selector = `${POPPER}, ${DIALOG}`) {
  const el = await find(document.body, selector);
  await waitFor(() => expect(el).toBeVisible(), { timeout: 5000 });
  return el;
}

/** Waits until `text` is visible anywhere, e.g. a fetched row inside an overlay. */
export async function waitForText(text: string | RegExp) {
  await waitFor(
    () => expect(within(document.body).getAllByText(text)[0]).toBeVisible(),
    {
      timeout: 5000,
    },
  );
}

/** Clicks the trigger (a CSS selector, or a button's accessible name) and waits for the overlay,
 * and for `text` inside it when the content loads or filters asynchronously. */
export const clickOpen =
  (trigger: string | RegExp, overlay?: string, text?: string | RegExp) =>
  async ({ canvasElement }: PlayCtx) => {
    const el =
      typeof trigger === "string"
        ? await find(canvasElement, trigger)
        : await within(canvasElement).findByRole(
            "button",
            { name: trigger },
            { timeout: 5000 },
          );
    await userEvent.click(el);
    await waitForOverlay(overlay);
    if (text) await waitForText(text);
  };

/** Radix tooltips and hover cards open on pointer enter. */
export const hoverOpen =
  (selector: string, overlay = POPPER) =>
  async ({ canvasElement }: PlayCtx) => {
    await userEvent.hover(await find(canvasElement, selector));
    await waitForOverlay(overlay);
  };

/** Focuses an element with the keyboard; tooltips also open on focus. */
export const focusOpen =
  (selector: string, overlay = POPPER) =>
  async ({ canvasElement }: PlayCtx) => {
    (await find(canvasElement, selector)).focus();
    await waitForOverlay(overlay);
  };

/* framer-motion animations run in JS, outside the capture's CSS freeze;
   the table refresh icon, for one, spins for 0.8s after mount. */
export const waitForMotion = () => settle(1000);

/* SMIL animations (the NetBird loading icon) are frozen at their start. */
export const pauseSvgAnimations = ({ canvasElement }: PlayCtx) => {
  canvasElement.querySelectorAll("svg").forEach((svg) => {
    svg.pauseAnimations();
    svg.setCurrentTime(0);
  });
};
