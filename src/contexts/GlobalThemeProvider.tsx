"use client";

import "react-loading-skeleton/dist/skeleton.css";
import dynamic from "next/dynamic";
import * as React from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import { useTheme } from "@/contexts/ThemeProvider";

const ThemeProvider = dynamic(
  () => import("@/contexts/ThemeProvider").then((mod) => mod.ThemeProvider),
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
      baseColor={isLight ? "#edeff1" : "#25282d"}
      highlightColor={isLight ? "#f8fafb" : "#33373e"}
    >
      {children}
    </SkeletonTheme>
  );
}

export function GlobalThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ThemedSkeleton>{children}</ThemedSkeleton>
    </ThemeProvider>
  );
}
