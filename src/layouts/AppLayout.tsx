"use client";

import "../app/globals.css";
import { DisableDarkReader } from "@components/DisableDarkReader";
import { TooltipProvider } from "@components/Tooltip";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { NextIntlClientProvider } from 'next-intl';
import { Viewport } from "next";
import localFont from "next/font/local";
import React, { Suspense } from "react";
import { Toaster } from "sonner";
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

import en from "@/i18n/messages/en";
import zh from "@/i18n/messages/zh";

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
    <html lang="zh">
      <head>
        <GoogleTagManagerHeadScript />
      </head>
      <body className={cn(inter.className)}>
        <NextIntlClientProvider locale="zh" messages={zh} timeZone="Asia/Shanghai">
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
              position="top-center"
              duration={3000}
              toastOptions={{ unstyled: true }}
              style={{ "--width": "28rem" } as React.CSSProperties}
              gap={0}
              visibleToasts={5}
              offset="12px"
            />
            <NavigationEvents />
            <DisableDarkReader />
          </AnalyticsProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
