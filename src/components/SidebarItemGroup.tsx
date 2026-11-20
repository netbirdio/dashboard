"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { cn } from "@utils/helpers";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useToggleAnimation } from "@/modules/navigation/useToggleAnimation";

type Props = {
  children: React.ReactNode;
  /**
   * A heading above the items, such as a product name; the heading and the
   * space above it set the group apart. Without one the group is a plain
   * list, set apart from the group before it by a divider.
   */
  label?: React.ReactNode;
  /** Shown next to the heading, e.g. a "Beta" badge. */
  badge?: React.ReactNode;
  /** The heading opens and closes the group. Needs `label`. */
  collapsible?: boolean;
  /** Whether a collapsible group is open; it is open when left out. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The current page is in this group, so the heading is highlighted. */
  active?: boolean;
  /** Marks the group in the DOM (`data-nav-section`), e.g. for page-level styles. */
  id?: string;
};

const groupClassName =
  "mt-3.5 border-t border-gray-200 pt-4 first:mt-0 first:border-t-0 first:pt-0 dark:border-zinc-700/40 space-y-px";

export default function SidebarItemGroup({
  children,
  label,
  badge,
  collapsible = false,
  open = true,
  onOpenChange,
  active = false,
  id,
}: Readonly<Props>) {
  const { isNavigationCollapsed, mobileNavOpen } = useApplicationContext();
  const toggleAnimation = useToggleAnimation();

  if (!label) {
    return (
      <div className={groupClassName} data-nav-section={id}>
        {children}
      </div>
    );
  }

  // A group with a heading is set apart by the heading and space alone. The
  // icon-only sidebar has no room for the heading, so a divider drawn in its
  // place stands in for it until a hover widens the sidebar again.
  const iconOnly = isNavigationCollapsed && !mobileNavOpen;
  // The icon-only heading can't be seen or clicked, so a closed group there
  // would hide its icons with no way back; every group stays open in that
  // mode, and its heading is a plain label while a hover widens it. The
  // remembered state applies again once the sidebar is full width.
  const canToggle = collapsible && !iconOnly;
  const isOpen = canToggle ? open : true;
  const Chevron = isOpen ? ChevronUpIcon : ChevronDownIcon;
  const labelledClassName = "mt-3.5 first:mt-0 border-t border-transparent";

  const heading = (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-0.5 text-left",
        "text-[.7rem] font-medium uppercase tracking-[.08em] transition-colors",
        active
          ? "text-gray-900 dark:text-nb-gray-100"
          : // A step quieter than the items below it.
            "text-gray-500/85 dark:text-nb-gray-400/85",
        canToggle &&
          !active &&
          "hover:text-gray-700 dark:hover:text-nb-gray-200",
        iconOnly && "opacity-0 group-hover/navigation:opacity-100",
      )}
    >
      <span className={"truncate"}>{label}</span>
      {badge}
      {canToggle && (
        <Chevron
          size={14}
          className={cn(
            "ml-auto shrink-0 transition-opacity",
            // An open section keeps the heading quiet: its chevron shows on
            // hover and keyboard focus. A closed one always shows it, as the
            // cue that items are hidden, and so does the touch-only drawer.
            isOpen &&
              !mobileNavOpen &&
              "opacity-0 group-hover/heading:opacity-100 group-focus-visible/heading:opacity-100",
          )}
        />
      )}
    </div>
  );

  return (
    <div className={labelledClassName} data-nav-section={id}>
      <Collapsible.Root
        open={isOpen}
        onOpenChange={(next) => {
          toggleAnimation.onToggle();
          onOpenChange?.(next);
        }}
      >
        <div className={"relative px-3"}>
          {/* Drawn across the hidden heading rather than above it, so
              collapsing the sidebar doesn't move the items. */}
          {iconOnly && (
            <span
              aria-hidden
              className={
                "absolute inset-x-0 top-1/2 h-px bg-gray-200 dark:bg-zinc-700/40 group-hover/navigation:opacity-0"
              }
            />
          )}
          {canToggle ? (
            <Collapsible.Trigger asChild>
              <button
                type={"button"}
                // Block rather than the default inline-block, so the heading
                // is as tall as the plain div used when it can't toggle.
                className={"group/heading block w-full cursor-pointer"}
                data-testid={"left-navigation-section"}
                data-active={active}
              >
                {heading}
              </button>
            </Collapsible.Trigger>
          ) : (
            <div data-testid={"left-navigation-section"} data-active={active}>
              {heading}
            </div>
          )}
        </div>
        <Collapsible.Content
          className={cn(
            "space-y-px pt-0.5 overflow-hidden",
            toggleAnimation.className,
          )}
          onAnimationEnd={toggleAnimation.onAnimationEnd}
        >
          {children}
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}
