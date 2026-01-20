"use client";

import Button from "@components/Button";
import { NetBirdLogo } from "@components/NetBirdLogo";
import { AnnouncementBanner } from "@components/ui/AnnouncementBanner";
import UserDropdown from "@components/ui/UserDropdown";
import { cn } from "@utils/helpers";
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import HelpAndSupportButton from "@components/ui/HelpAndSupportButton";

export const headerHeight = 65;

export default function NavbarWithDropdown() {
  const router = useRouter();
  const { toggleMobileNav } = useApplicationContext();
  const { bannerHeight } = useAnnouncement();
  const { isRestricted } = usePermissions();

  return (
    <>
      <div
        className={"fixed z-50 w-full"}
        style={{
          height: headerHeight + bannerHeight,
        }}
      >
        <AnnouncementBanner />
        <div
          className={cn(
            "bg-white px-2 py-3 dark:border-gray-700 dark:bg-nb-gray backdrop-blur-lg sm:px-6",
            "border-b dark:border-zinc-700/40 px-3 md:px-4 w-full",
            "flex justify-between items-center transition-all",
          )}
        >
          <div className={"flex items-center gap-4 md:hidden"}>
            <Button
              className={cn(
                "!px-3 md:hidden",
                isRestricted && "opacity-0 pointer-events-none",
              )}
              variant={"default-outline"}
              onClick={toggleMobileNav}
            >
              <div>
                <MenuIcon size={20} className={"relative"} />
              </div>
            </Button>
          </div>
          <div className={"flex gap-4 mr-auto"}>
            <button
              onClick={() => router.push("/peers")}
              className={
                "cursor-pointer hover:opacity-70 transition-all mr-auto"
              }
            >
              <NetBirdLogo />
            </button>
            <ToggleCollapsableNavigationButton />
          </div>

          <div className="flex md:order-2 gap-5 items-center">
            <HelpAndSupportButton />
            <UserDropdown />
          </div>
        </div>
      </div>
      <div
        style={{
          height: headerHeight + bannerHeight,
        }}
      ></div>
    </>
  );
}

const ToggleCollapsableNavigationButton = () => {
  const { isRestricted } = usePermissions();
  const { toggleNavigation, isNavigationCollapsed } = useApplicationContext();

  return (
    !isRestricted && (
      <button
        onClick={toggleNavigation}
        className={cn(
          "h-10 w-10 hover:text-white flex items-center justify-center text-nb-gray-300 transition-all ml-2",
          "hidden md:block",
        )}
      >
        {isNavigationCollapsed ? (
          <PanelLeftOpenIcon size={16} />
        ) : (
          <PanelLeftCloseIcon size={16} />
        )}
      </button>
    )
  );
};
