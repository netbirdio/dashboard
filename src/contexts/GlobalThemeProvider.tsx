"use client";

import "react-loading-skeleton/dist/skeleton.css";
import { netbirdTheme } from "@utils/theme";
import { Flowbite } from "flowbite-react";
import dynamic from "next/dynamic";
import { type ThemeProviderProps } from "next-themes/dist/types";
import * as React from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import { useTheme } from "next-themes";

const NextThemesProvider = dynamic(
  () => import("next-themes").then((mod) => mod.ThemeProvider),
  { ssr: false },
);

function ThemedSkeletonProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, theme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <SkeletonTheme
      baseColor={isDark ? "#25282d" : "#e4e7e9"}
      highlightColor={isDark ? "#33373e" : "#f4f6f7"}
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
      <Flowbite theme={{ theme: netbirdTheme }}>
        <ThemedSkeletonProvider>
          {children}
        </ThemedSkeletonProvider>
      </Flowbite>
    </NextThemesProvider>
  );
}
