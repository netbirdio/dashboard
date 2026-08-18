"use client";

import Button from "@components/Button";
import { NetBirdLogo } from "@components/NetBirdLogo";
import { AnnouncementBanner } from "@components/ui/AnnouncementBanner";
import HelpAndSupportButton from "@components/ui/HelpAndSupportButton";
import UserDropdown from "@components/ui/UserDropdown";
import { cn } from "@utils/helpers";
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { toggleMobileNav } = useApplicationContext();
  const { bannerHeight } = useAnnouncement();
  const { isRestricted } = usePermissions();

  return (
    /*
      A normal in-flow child of the dashboard card — deliberately not `fixed`.
      Fixed positioning took the header out of the card's box, so it couldn't
      inherit the card's margin and had to be animated separately with matching
      insets. Two elements animating in lockstep is what produced the vertical
      jump, the flashing border, the mismatched corners and the missing bottom
      border. In flow it simply moves with the card, and the card's own border,
      rounding and `overflow-hidden` clip it for free.

      Safe because the card's contents already sum to exactly its height (header
      + content), so the page itself never scrolls and nothing needs pinning.
    */
    <div
      className={"relative z-50 shrink-0"}
      style={{ height: headerHeight + bannerHeight }}
    >
      <AnnouncementBanner />
      <div
        className={cn(
          "bg-white px-2 py-3 dark:border-gray-700 dark:bg-nb-gray backdrop-blur-lg sm:px-6",
          "border-b dark:border-zinc-700/40 px-3 md:px-4 w-full",
          // `transition-colors`, not `transition-all`: this bar is `w-full`, so
          // when the wrapper's insets animate its own computed width changes
          // every frame. Under `transition-all` it animated that width too, on
          // a separate default timeline, so it visibly lagged and juddered
          // behind the wrapper. Colour transitions are what this was for.
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
          {/* The launcher sits on the panel's own side of the header. */}
          {PANEL_ON_LEFT && !isRestricted && <AssistantButton />}
        </div>

        <div className="flex md:order-2 gap-5 items-center">
          <MSPTransferAccountModal />
          <DistributorTransferAccountModal />
          <MSPTenantsSwitcher />
          {/* Tighter than the row's gap: these two read as one control pair. */}
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
