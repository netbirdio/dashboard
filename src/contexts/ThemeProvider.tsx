"use client";

import "react-loading-skeleton/dist/skeleton.css";
import * as React from "react";
import { SkeletonTheme } from "react-loading-skeleton";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "netbird-theme";
const DEFAULT_THEME: Theme = "dark";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/* Production fallback when useTheme is called outside ThemeProvider —
   in development the same misuse throws instead. */
const FALLBACK_CONTEXT: ThemeContextValue = {
  theme: DEFAULT_THEME,
  resolvedTheme: "dark",
  setTheme: () => undefined,
};

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. blocked by browser settings)
  }
  return DEFAULT_THEME;
};

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/* Suspends CSS transitions for one frame so the whole page switches
   theme at once instead of elements fading at different speeds. */
const withTransitionsDisabled = (apply: () => void) => {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important}",
    ),
  );
  document.head.appendChild(style);
  try {
    apply();
  } finally {
    window.getComputedStyle(document.documentElement);
    setTimeout(() => style.remove(), 1);
  }
};

/**
 * Wraps the skeleton loader theme so its colors follow the active theme.
 * Uses `resolvedTheme` so the "system" option resolves to the real OS value.
 * The palette is correct from the first render: ThemeProvider initializes
 * `resolvedTheme` synchronously from storage / the system preference.
 */
function ThemedSkeleton({
  resolvedTheme,
  children,
}: {
  resolvedTheme: "light" | "dark";
  children: React.ReactNode;
}) {
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] =
    React.useState<"light" | "dark">(getSystemTheme);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  React.useEffect(() => {
    withTransitionsDisabled(() => {
      const root = document.documentElement;
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.style.colorScheme = resolvedTheme;
    });
  }, [resolvedTheme]);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // theme still applies for the session, just won't persist
    }
    setThemeState(next);
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemedSkeleton resolvedTheme={resolvedTheme}>
        {children}
      </ThemedSkeleton>
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextValue => {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error("useTheme must be used within a ThemeProvider");
    }
    return FALLBACK_CONTEXT;
  }
  return ctx;
};
