"use client";

import "../app/globals.css";
import { DisableDarkReader } from "@components/DisableDarkReader";
import { TooltipProvider } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Viewport } from "next";
import localFont from "next/font/local";
import React, { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import OIDCProvider from "@/auth/OIDCProvider";
import FullScreenLoading from "@/components/ui/FullScreenLoading";
import AnalyticsProvider, {
  GoogleTagManagerHeadScript,
} from "@/contexts/AnalyticsProvider";
import DialogProvider from "@/contexts/DialogProvider";
import ErrorBoundaryProvider from "@/contexts/ErrorBoundary";
import { GlobalThemeProvider } from "@/contexts/GlobalThemeProvider";
import InstanceSetupProvider from "@/contexts/InstanceSetupProvider";
import { NavigationEvents } from "@/contexts/NavigationEvents";

const inter = localFont({
  src: "../assets/fonts/Inter.ttf",
  display: "swap",
});

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManagerHeadScript />
      </head>
      <body className={cn(inter.className)}>
        <Suspense fallback={<FullScreenLoading />}>
          <AnalyticsProvider>
            <DialogProvider>
              <GlobalThemeProvider>
                <ErrorBoundaryProvider>
                  <InstanceSetupProvider>
                    <OIDCProvider>
                      <TooltipProvider delayDuration={0}>
                        {children}
                      </TooltipProvider>
                    </OIDCProvider>
                  </InstanceSetupProvider>
                </ErrorBoundaryProvider>
              </GlobalThemeProvider>
            </DialogProvider>
            <Toaster
              position={"top-center"}
              toastOptions={{
                duration: 3000,
              }}
            />
            <NavigationEvents />
            <DisableDarkReader />
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
