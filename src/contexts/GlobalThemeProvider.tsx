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
 * The palette is correct from the first render: ThemeProvider initializes
 * `resolvedTheme` synchronously from storage / the system preference.
 */
function ThemedSkeleton({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <SkeletonTheme
      baseColor={
        isLight ? "rgb(var(--nb-gray-900))" : "rgb(var(--nb-gray-920))"
      }
      highlightColor={
        isLight ? "rgb(var(--nb-gray-940))" : "rgb(var(--nb-gray-850))"
      }
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
