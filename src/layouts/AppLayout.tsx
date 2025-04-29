"use client";

import "../app/globals.css";
import { DisableDarkReader } from "@components/DisableDarkReader";
import { TooltipProvider } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Viewport } from "next/dist/lib/metadata/types/extra-types";
import localFont from "next/font/local";
import React from "react";
import { Toaster } from "react-hot-toast";
import OIDCProvider from "@/auth/OIDCProvider";
import AnalyticsProvider from "@/contexts/AnalyticsProvider";
import DialogProvider from "@/contexts/DialogProvider";
import ErrorBoundaryProvider from "@/contexts/ErrorBoundary";
import { GlobalThemeProvider } from "@/contexts/GlobalThemeProvider";
import { NavigationEvents } from "@/contexts/NavigationEvents";

const interFont = localFont({
  src: "../assets/fonts/Inter.ttf",
  display: "swap",
});

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full")} suppressHydrationWarning>
      <body className={cn(interFont.className, "bg-default transition-colors")}>
        <AnalyticsProvider>
          <DialogProvider>
            <ErrorBoundaryProvider>
              <OIDCProvider>
                <GlobalThemeProvider>
                  <TooltipProvider delayDuration={0}>
                    {children}
                  </TooltipProvider>
                </GlobalThemeProvider>
              </OIDCProvider>
            </ErrorBoundaryProvider>
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
      </body>
    </html>
  );
}
