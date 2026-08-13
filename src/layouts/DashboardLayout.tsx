"use client";

import "../app/globals.css";
import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import { UserAvatar } from "@components/ui/UserAvatar";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { useIsSm, useIsXs } from "@utils/responsive";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import React, { Suspense } from "react";
import { NetBirdCloudProvider } from "@/cloud/contexts/NetBirdCloudProvider";
import DistributorProvider from "@/cloud/distributor/contexts/DistributorProvider";
import MSPProvider from "@/cloud/msp/contexts/MSPProvider";
import AnnouncementProvider, {
  useAnnouncement,
} from "@/contexts/AnnouncementProvider";
import ApplicationProvider, {
  useApplicationContext,
} from "@/contexts/ApplicationProvider";
import BillingProvider from "@/contexts/BillingProvider";
import CountryProvider from "@/contexts/CountryProvider";
import GroupsProvider from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import UsersProvider from "@/contexts/UsersProvider";
import Navigation from "@/layouts/Navigation";
import AssistantPanel from "@/modules/assistant/AssistantPanel";
import {
  AssistantPanelProvider,
  PANEL_ON_LEFT,
  PANEL_WIDTH,
  useAssistantPanel,
} from "@/modules/assistant/AssistantPanelContext";
import { AssistantContextProvider } from "@/modules/assistant/context/AssistantContextProvider";
import RouteAssistantContext from "@/modules/assistant/context/routeContext";
import { OnboardingProvider } from "@/modules/onboarding/OnboardingProvider";
import Header, { headerHeight } from "./Header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ApplicationProvider>
      <DistributorProvider>
        <MSPProvider>
          <UsersProvider>
            <AnnouncementProvider>
              <BillingProvider>
                <GroupsProvider>
                  <CountryProvider>
                    <AssistantPanelProvider>
                      <AssistantContextProvider>
                        <NetBirdCloudProvider />
                        {!isNetBirdCloud() && <OnboardingProvider />}
                        {/* Reads the URL and publishes what the user is looking
                          at. Inside Suspense because `useSearchParams` opts the
                          tree out of static rendering otherwise. */}
                        <Suspense fallback={null}>
                          <RouteAssistantContext />
                        </Suspense>
                        <DashboardPageContent>{children}</DashboardPageContent>
                      </AssistantContextProvider>
                    </AssistantPanelProvider>
                  </CountryProvider>
                </GroupsProvider>
              </BillingProvider>
            </AnnouncementProvider>
          </UsersProvider>
        </MSPProvider>
      </DistributorProvider>
    </ApplicationProvider>
  );
}

/**
 * True while the window is being resized, and for a moment after.
 *
 * Used to suppress the card's geometry transition: it exists to animate the
 * panel opening, and a resize is not that — it's the user dragging an edge and
 * expecting the layout to keep up.
 */
function useIsResizing(): boolean {
  const [resizing, setResizing] = React.useState(false);

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const onResize = () => {
      setResizing(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setResizing(false), 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timeout);
    };
  }, []);

  return resizing;
}

function DashboardPageContent({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { oidcUser: user } = useOidcUser();
  const { mobileNavOpen, toggleMobileNav } = useApplicationContext();
  const isSm = useIsSm();
  const isXs = useIsXs();
  const { isRestricted } = usePermissions();

  const navOpenPageWidth = isSm ? "45%" : isXs ? "60%" : "80%";
  const { bannerHeight } = useAnnouncement();
  const { reveal, inset } = useAssistantPanel();
  const resizing = useIsResizing();

  return (
    <>
      {!isRestricted && <AssistantPanel />}

      {/*
        The dashboard card. Sits above the panel and shrinks to reveal it —
        the panel itself never moves. Rendered as a sibling of the panel (not a
        parent) because the animated subtree below applies transforms, which
        would capture the panel's `position: fixed`.
      */}
      <div
        className={cn(
          // z-10 keeps the card above the panel for the whole transition, not
          // just at rest.
          "relative z-10",
          // Transition the geometry only. `transition-all` also animated
          // border-color and border-width from their initial values, which read
          // as the border flashing/changing colour as the panel opened.
          "transition-[margin,height] duration-300 ease-out",
          // ...except while the window is being resized. The height is derived
          // from `100vh`, so every resize tick would otherwise animate for
          // 300ms and the card would lag behind the window edge.
          resizing && "transition-none",
          // Applied only while revealed, so the closed state is exactly the
          // layout that existed before the panel: no clipping that could cut off
          // a non-portaled dropdown, no background change.
          //
          // This single border/rounding is now the whole outline — the header is
          // an in-flow child, so `overflow-hidden` clips its top corners and it
          // no longer draws any part of the edge itself.
          reveal &&
            "overflow-hidden rounded-2xl border border-nb-gray-900 bg-nb-gray-950 shadow-2xl",
        )}
        style={{
          marginTop: inset,
          marginBottom: inset,
          // The panel's edge takes the panel's width; the other keeps the inset.
          marginLeft: PANEL_ON_LEFT && reveal ? PANEL_WIDTH : inset,
          marginRight: !PANEL_ON_LEFT && reveal ? PANEL_WIDTH : inset,
          height: `calc(100vh - ${inset * 2}px)`,
        }}
      >
        <div className={cn("flex flex-col h-full", mobileNavOpen && "flex")}>
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
                width: "100%",
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
                <Header />
                <div
                  className={"relative flex flex-row flex-grow"}
                  style={{
                    // The card's vertical margins come out of the viewport too, or
                    // the content would overflow by that much once the panel opens.
                    height: `calc(100vh - ${
                      headerHeight + bannerHeight + inset * 2
                    }px)`,
                  }}
                >
                  {!isRestricted && <Navigation hideOnMobile />}
                  <React.Fragment key={"page"}>{children}</React.Fragment>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
