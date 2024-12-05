"use client";

import Button from "@components/Button";
import { AnnouncementBanner } from "@components/ui/AnnouncementBanner";
import DarkModeToggle from "@components/ui/DarkModeToggle";
import UserDropdown from "@components/ui/UserDropdown";
import { cn } from "@utils/helpers";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import NetBirdLogo from "@/assets/netbird.svg";
import NetBirdLogoFull from "@/assets/netbird-full.svg";
import { useAnnouncement } from "@/contexts/AnnouncementProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";

export const headerHeight = 75;

export default function NavbarWithDropdown() {
  const router = useRouter();
  const Logo = useMemo(() => {
    return (
      <>
        <Image
          src={NetBirdLogoFull}
          height={22}
          alt={"NetBird Logo"}
          priority={true}
          className={"hidden md:block"}
        />
        <Image
          src={NetBirdLogo}
          width={30}
          alt={"NetBird Logo"}
          priority={true}
          className={"md:hidden"}
        />
      </>
    );
  }, []);

  const { toggleMobileNav } = useApplicationContext();
  const { bannerHeight } = useAnnouncement();
  const { permission } = useLoggedInUser();

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
            "bg-white px-2 py-4 dark:border-gray-700 dark:bg-nb-gray/50 backdrop-blur-lg sm:px-6",
            "border-b dark:border-zinc-700/40 px-3 md:px-4 w-full",
            "flex justify-between items-center transition-all",
          )}
        >
          <div className={"flex items-center gap-4 md:hidden"}>
            <Button
              className={cn(
                "!px-3 md:hidden",
                permission.dashboard_view == "blocked" &&
                  "opacity-0 pointer-events-none",
              )}
              variant={"default-outline"}
              onClick={toggleMobileNav}
            >
              <div>
                <MenuIcon size={20} className={"relative"} />
              </div>
            </Button>
          </div>
          <div
            onClick={() => router.push("/peers")}
            className={"cursor-pointer hover:opacity-70 transition-all"}
          >
            {Logo}
          </div>

          <div className="flex md:order-2 gap-4">
            <div className={"hidden md:block"}>
              <DarkModeToggle />
            </div>

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
