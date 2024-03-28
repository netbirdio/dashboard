"use client";

import "../app/globals.css";
import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import { UserAvatar } from "@components/ui/UserAvatar";
import { cn } from "@utils/helpers";
import { useIsSm, useIsXs } from "@utils/responsive";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import React from "react";
import AnnouncementProvider, {
  useAnnouncement,
} from "@/contexts/AnnouncementProvider";
import ApplicationProvider, {
  useApplicationContext,
} from "@/contexts/ApplicationProvider";
import CountryProvider from "@/contexts/CountryProvider";
import GroupsProvider from "@/contexts/GroupsProvider";
import UsersProvider, { useLoggedInUser } from "@/contexts/UsersProvider";
import Navigation from "@/layouts/Navigation";
import Navbar, { headerHeight } from "./Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApplicationProvider>
      <UsersProvider>
        <GroupsProvider>
          <CountryProvider>
            <AnnouncementProvider>
              <DashboardPageContent>{children}</DashboardPageContent>
            </AnnouncementProvider>
          </CountryProvider>
        </GroupsProvider>
      </UsersProvider>
    </ApplicationProvider>
  );
}

function DashboardPageContent({ children }: { children: React.ReactNode }) {
  const { oidcUser: user } = useOidcUser();
  const { mobileNavOpen, toggleMobileNav } = useApplicationContext();
  const isSm = useIsSm();
  const isXs = useIsXs();
  const { permission } = useLoggedInUser();

  const navOpenPageWidth = isSm ? "50%" : isXs ? "65%" : "80%";
  const { bannerHeight } = useAnnouncement();
  return (
    <div className={cn("flex flex-col h-screen", mobileNavOpen && "flex")}>
      {mobileNavOpen && (
        <motion.div
          className={"h-screen bg-nb-gray-950 w-11/12 max-w-[22rem]"}
          layout={true}
          transition={{
            type: "spring",
            stiffness: 100,
            bounce: 0.8,
            damping: 10,
            mass: 0.4,
          }}
          animate={{
            x: 0,
          }}
          initial={{
            x: -200,
          }}
        >
          <div
            className={
              "flex items-center justify-between gap-3 pl-4 pr-8 pt-8 pb-3 w-11/12"
            }
          >
            <div className={"flex items-center gap-3 max-w-[22rem]"}>
              <UserAvatar size={"small"} />
              <div className="flex flex-col space-y-1">
                <p className="font-medium leading-none dark:text-gray-300">
                  {user?.name}
                </p>
                <p className="text-xs leading-none dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              className={"!px-3"}
              variant={"default-outline"}
              size={"xs"}
              onClick={toggleMobileNav}
            >
              <div>
                <XIcon size={16} className={"relative"} />
              </div>
            </Button>
          </div>
          <Navigation fullWidth />
        </motion.div>
      )}
      <AnimatePresence mode={"wait"}>
        <motion.div
          layout={"position"}
          className={cn(
            mobileNavOpen
              ? "border border-nb-gray-900 shadow-inner overflow-hidden rounded-xl fixed scale-75"
              : "",
          )}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
            duration: 0.45,
            mass: 0.1,
          }}
          animate={{
            x: mobileNavOpen ? navOpenPageWidth : 0,
            width: mobileNavOpen ? "100%" : "100%",
            height: mobileNavOpen ? "90vh" : "auto",
            y: mobileNavOpen ? "6.5%" : 0,
          }}
        >
          {mobileNavOpen && (
            <motion.div
              onClick={toggleMobileNav}
              className={
                "absolute w-full h-full bg-black z-[999] transition-all opacity-0"
              }
              animate={{
                opacity: 0.2,
              }}
            ></motion.div>
          )}
          <motion.div
            layout={"position"}
            className={"relative"}
            animate={{
              scale: mobileNavOpen ? 0.75 : 1,
              height: mobileNavOpen ? "90vh" : "auto",
              originX: 0,
              originY: 0,
            }}
            transition={{
              type: "spring",
              duration: 0.45,
              stiffness: 500,
              damping: 25,
              mass: 0.1,
            }}
          >
            <Navbar />

            <div
              className={"flex flex-row flex-grow"}
              style={{
                height: `calc(100vh - ${headerHeight + bannerHeight}px)`,
              }}
            >
              {permission.dashboard_view !== "blocked" && (
                <Navigation hideOnMobile />
              )}
              {children}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
