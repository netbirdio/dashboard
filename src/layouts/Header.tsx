"use client";

import Button from "@components/Button";
import { NetBirdLogo } from "@components/NetBirdLogo";
import { AnnouncementBanner } from "@components/ui/AnnouncementBanner";
import HelpAndSupportButton from "@components/ui/HelpAndSupportButton";
import UserDropdown from "@components/ui/UserDropdown";
import { cn } from "@utils/helpers";
import { useGuardedRouter } from "@utils/navigation-guard";
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import React from "react";
import { DistributorTransferAccountModal } from "@/cloud/distributor/DistributorTransferAccountModal";
import { MSPTenantsSwitcher } from "@/cloud/msp/MSPTenantsSwitcher";
import { MSPTransferAccountModal } from "@/cloud/msp/MSPTransferAccountModal";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { PANEL_ON_LEFT } from "@/interfaces/Assistant";
import AssistantButton from "@/modules/assistant/AssistantButton";

export const headerHeight = 65;

export default function NavbarWithDropdown() {
  const router = useGuardedRouter();
  const { toggleMobileNav } = useApplicationContext();
  const { bannerHeight } = useAnnouncement();
  const { isRestricted } = usePermissions();

  return (
    <div
      className={"relative z-50 shrink-0"}
      style={{ height: headerHeight + bannerHeight }}
    >
      <AnnouncementBanner />
      <div
        className={cn(
          "bg-white px-2 py-3 dark:border-gray-700 dark:bg-nb-gray backdrop-blur-lg sm:px-6",
          "border-b dark:border-zinc-700/40 px-3 md:px-4 w-full",
          // Not `transition-all`: that also animates the width, which judders
          // as the card's insets change.
          "flex justify-between items-center transition-colors",
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
        <div className={"flex gap-4 mr-auto items-center"}>
          <button
            onClick={() => router.push("/peers")}
            className={"cursor-pointer hover:opacity-70 transition-all mr-auto"}
          >
            <NetBirdLogo />
          </button>
          <ToggleCollapsableNavigationButton />
          {PANEL_ON_LEFT && !isRestricted && <AssistantButton />}
        </div>

        <div className="flex md:order-2 gap-5 items-center">
          <MSPTransferAccountModal />
          <DistributorTransferAccountModal />
          <MSPTenantsSwitcher />
          <div className={"flex items-center gap-2"}>
            <HelpAndSupportButton />
            {!PANEL_ON_LEFT && !isRestricted && <AssistantButton />}
          </div>
          <UserDropdown />
        </div>
      </div>
    </div>
  );
}

const ToggleCollapsableNavigationButton = () => {
  const { isRestricted } = usePermissions();
  const { toggleNavigation, isNavigationCollapsed } = useApplicationContext();

  return (
    !isRestricted && (
      <button
        onClick={toggleNavigation}
        data-navbar-colappse-toggle
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
