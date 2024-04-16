"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import classNames from "classnames";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo } from "react";
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
}: SidebarItemProps) {
  const [open, setOpen] = React.useState(false);
  const path = usePathname();
  const router = useRouter();
  const { mobileNavOpen, toggleMobileNav } = useApplicationContext();

  const handleClick = () => {
    const preventRedirect = href
      ? exactPathMatch
        ? path == href
        : path.includes(href)
      : false;
    if (collapsible && mobileNavOpen) return;
    if (collapsible && open) return;
    if (preventRedirect) return;
    if (target == "_blank") return window.open(href, "_blank");
    if (mobileNavOpen) toggleMobileNav();
    router.push(href);
  };

  const isActive = useMemo(() => {
    if (collapsible) return false;
    return href ? (exactPathMatch ? path == href : path.includes(href)) : false;
  }, [path, href, exactPathMatch, collapsible]);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger asChild>
        <li className={"px-4 cursor-pointer"}>
          <button
            className={classNames(
              "rounded-lg text-[.95rem] w-full ",
              "font-normal ",
              className,
              isChild ? "pl-7 pr-2 py-2 mt-1 mb-0.5" : "py-2 px-3",
              isActive
                ? "text-gray-900 bg-gray-200 dark:text-white dark:bg-nb-gray-900"
                : "text-gray-600 hover:bg-gray-200 dark:text-nb-gray-400 dark:hover:bg-nb-gray-900/50",
            )}
            onClick={handleClick}
          >
            <div
              className={classNames(
                "flex w-full items-center shrink-0",
                href == "" ? "disabled pointer-events-none" : "",
              )}
            >
              <span className="peer/icon" data-active={isActive} />
              {icon}
              <span className="px-4 whitespace-nowrap flex-1 w-full text-left">
                {label}
              </span>
              {collapsible &&
                (open ? (
                  <ChevronUpIcon className={"shrink-0"} />
                ) : (
                  <ChevronDownIcon className={"shrink-0"} />
                ))}
            </div>
          </button>
        </li>
      </Collapsible.Trigger>
      {collapsible && <Collapsible.Content>{children}</Collapsible.Content>}
    </Collapsible.Root>
  );
}
