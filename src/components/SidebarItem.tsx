"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { cn } from "@utils/helpers";
import { ChevronDownIcon, ChevronUpIcon, DotIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useMemo } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

export type SidebarItemProps = {
  onClick?: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  label?: React.ReactNode;
  collapsible?: boolean;
  className?: string;
  isChild?: boolean;
  href?: string;
  exactPathMatch?: boolean;
  target?: string;
  labelClassName?: string;
  visible: boolean;
};

export default function SidebarItem({
  icon,
  children,
  label,
  collapsible = false,
  className,
  isChild = false,
  href = "",
  exactPathMatch = false,
  target = "_self",
  labelClassName,
  visible,
}: Readonly<SidebarItemProps>) {
  const path = usePathname();

  // Check if any child route is active (for collapsible items)
  const hasActiveChild = useMemo(() => {
    if (!collapsible || !href) return false;
    return path === href || path.startsWith(href + "/");
  }, [collapsible, href, path]);

  const [open, setOpen] = React.useState(hasActiveChild);

  // Open the collapsible if a child route becomes active
  useEffect(() => {
    if (hasActiveChild && !open) {
      setOpen(true);
    }
  }, [hasActiveChild]);
  const { mobileNavOpen, toggleMobileNav, isNavigationCollapsed } =
    useApplicationContext();

  const isActive = useMemo(() => {
    if (collapsible) return false;
    return href
      ? exactPathMatch
        ? path === href
        : path.includes(href)
      : false;
  }, [path, href, exactPathMatch, collapsible]);

  const handleClick = (e: React.MouseEvent) => {
    if (collapsible) return;

    if (isActive) {
      return e.preventDefault();
    }

    if (target === "_blank") return;

    if (mobileNavOpen) toggleMobileNav();
  };

  if (!visible) return;

  const content = (
    <div
      className={cn(
        "rounded-lg text-[.87rem] w-full relative font-normal",
        className,
        isChild ? "pl-7 pr-2 py-[.45rem] mt-1 mb-0.5" : "py-[.45rem] px-3",
        isActive
          ? "text-gray-900 bg-gray-200 dark:text-white dark:bg-nb-gray-900"
          : "text-gray-600 hover:bg-gray-200 dark:text-nb-gray-400 dark:hover:bg-nb-gray-900/50",
      )}
      data-cy={"left-navigation-item"}
    >
      {isChild && isNavigationCollapsed && !mobileNavOpen && (
        <div
          className={
            "absolute left-0 top-0 w-full h-full flex items-center justify-center group-hover/navigation:hidden text-[10px]"
          }
        >
          <DotIcon size={14} className={"shrink-0"} />
        </div>
      )}
      <div
        className={cn(
          "flex w-full items-center shrink-0 ",
          href === "" ? "disabled pointer-events-none" : "",
        )}
      >
        <span className="peer/icon" data-active={isActive} />
        {icon}

        <span
          className={cn(
            "px-3 whitespace-nowrap flex-1 w-full text-left",
            labelClassName,
            isNavigationCollapsed &&
              !mobileNavOpen &&
              "opacity-0 group-hover/navigation:opacity-100",
          )}
        >
          {label}
        </span>
        {collapsible &&
          (open ? (
            <ChevronUpIcon
              size={18}
              className={cn(
                "shrink-0",
                isNavigationCollapsed &&
                  !mobileNavOpen &&
                  "opacity-0 group-hover/navigation:opacity-100",
              )}
            />
          ) : (
            <ChevronDownIcon
              size={18}
              className={cn(
                "shrink-0",
                isNavigationCollapsed &&
                  !mobileNavOpen &&
                  "opacity-0 group-hover/navigation:opacity-100",
              )}
            />
          ))}
      </div>
    </div>
  );

  const itemContent = (
    <li className={"px-3 cursor-pointer list-none"}>
      {href && !collapsible ? (
        <Link
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          onClick={handleClick}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={"w-full"}
          onClick={handleClick}
          disabled={href === ""}
        >
          {content}
        </button>
      )}
    </li>
  );

  if (collapsible) {
    return (
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger asChild>{itemContent}</Collapsible.Trigger>
        <Collapsible.Content>{children}</Collapsible.Content>
      </Collapsible.Root>
    );
  }

  return itemContent;
}
