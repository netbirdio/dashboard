"use client";

import "react-loading-skeleton/dist/skeleton.css";
import dynamic from "next/dynamic";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useTheme } from "next-themes";
import * as React from "react";
import { SkeletonTheme } from "react-loading-skeleton";

const NextThemesProvider = dynamic(
  () => import("next-themes").then((mod) => mod.ThemeProvider),
  { ssr: false },
);

/**
 * Wraps the skeleton loader theme so its colors follow the active theme.
 * Uses `resolvedTheme` so the "system" option resolves to the real OS value.
 * Defaults to the dark palette before mount to match the dark default theme.
 */
function ThemedSkeleton({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <SkeletonTheme
      baseColor={isLight ? "#e4e7e9" : "#25282d"}
      highlightColor={isLight ? "#f4f6f7" : "#33373e"}
    >
      {children}
    </SkeletonTheme>
  );
}

export function GlobalThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="netbird-theme"
      enableSystem={true}
      disableTransitionOnChange
      {...props}
    >
      <ThemedSkeleton>{children}</ThemedSkeleton>
    </NextThemesProvider>
  );
}
