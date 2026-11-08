"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { cn } from "@utils/helpers";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

type Props = {
  children: React.ReactNode;
  /**
   * A heading above the items, such as a product name. Without one the
   * group is a plain list, set apart from the group before it by a divider.
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
  "mt-4 border-t border-gray-200 pt-4 first:mt-0 first:border-t-0 first:pt-0 dark:border-zinc-700/40 space-y-[3px]";

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

  if (!label) {
    return (
      <div className={groupClassName} data-nav-section={id}>
        {children}
      </div>
    );
  }

  // In the icon-only sidebar there is no room for the heading; the divider
  // keeps the groups apart until a hover widens the sidebar again.
  const iconOnly = isNavigationCollapsed && !mobileNavOpen;
  const isOpen = collapsible ? open : true;
  const Chevron = isOpen ? ChevronUpIcon : ChevronDownIcon;

  const heading = (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-1 text-left",
        "text-[.7rem] font-medium uppercase tracking-[.08em] transition-colors",
        active
          ? "text-gray-900 dark:text-nb-gray-100"
          : "text-gray-500 dark:text-nb-gray-400",
        collapsible &&
          !active &&
          "hover:text-gray-700 dark:hover:text-nb-gray-200",
        iconOnly && "opacity-0 group-hover/navigation:opacity-100",
      )}
    >
      <span className={"truncate"}>{label}</span>
      {active && (
        <span
          aria-hidden={true}
          data-testid={"left-navigation-section-active"}
          className={"h-1.5 w-1.5 shrink-0 rounded-full bg-netbird"}
        />
      )}
      {badge}
      {collapsible && <Chevron size={14} className={"ml-auto shrink-0"} />}
    </div>
  );

  return (
    <div className={groupClassName} data-nav-section={id}>
      <Collapsible.Root open={isOpen} onOpenChange={onOpenChange}>
        <div className={"px-3"}>
          {collapsible ? (
            <Collapsible.Trigger asChild>
              <button
                type={"button"}
                className={"w-full cursor-pointer"}
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
        <Collapsible.Content className={"space-y-[3px] pt-[3px]"}>
          {children}
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}
