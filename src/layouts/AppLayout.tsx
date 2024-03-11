"use client";

import "../app/globals.css";
import { TooltipProvider } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Viewport } from "next/dist/lib/metadata/types/extra-types";
import { Inter } from "next/font/google";
import React from "react";
import { Toaster } from "react-hot-toast";
import OIDCProvider from "@/auth/OIDCProvider";
import AnalyticsProvider from "@/contexts/AnalyticsProvider";
import AnnouncementProvider from "@/contexts/AnnouncementProvider";
import DialogProvider from "@/contexts/DialogProvider";
import ErrorBoundaryProvider from "@/contexts/ErrorBoundary";
import { GlobalThemeProvider } from "@/contexts/GlobalThemeProvider";
import { NavigationEvents } from "@/contexts/NavigationEvents";

const inter = Inter({ subsets: ["latin"] });

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "dark:bg-nb-gray bg-gray-50")}>
        <AnalyticsProvider>
          <DialogProvider>
            <GlobalThemeProvider>
              <ErrorBoundaryProvider>
                <OIDCProvider>
                  <AnnouncementProvider>
                    <TooltipProvider delayDuration={0}>
                      {children}
                    </TooltipProvider>
                  </AnnouncementProvider>
                </OIDCProvider>
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
        </AnalyticsProvider>
      </body>
    </html>
  );
}
