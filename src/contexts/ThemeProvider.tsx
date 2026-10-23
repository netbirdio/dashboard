"use client";

import "react-loading-skeleton/dist/skeleton.css";
import * as React from "react";
import { SkeletonTheme } from "react-loading-skeleton";

export type Theme = "light" | "dark" | "system";

type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "netbird-theme";
const DEFAULT_THEME: Theme = "dark";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/* Production fallback when useTheme is called outside ThemeProvider —
   in development the same misuse throws instead. */
const FALLBACK_CONTEXT: ThemeContextValue = {
  theme: DEFAULT_THEME,
  resolvedTheme: "dark",
  setTheme: () => undefined,
};

/* Both inputs are exposed as external stores so the server render and the
   hydration pass agree on DEFAULT_THEME (the html element ships with the
   `dark` class), and React then re-renders with the real client value.
   Reading localStorage / matchMedia in a useState initializer instead made
   the first client render disagree with the server HTML — e.g.
   DarkModeToggle's aria-pressed — and trip hydration warnings. */

const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";

/* Fallback when localStorage is unavailable (e.g. blocked by browser
   settings): the choice still applies for the session, it just won't persist. */
let sessionTheme: Theme | null = null;
const themeListeners = new Set<() => void>();

const getStoredTheme = (): Theme => {
  if (sessionTheme) return sessionTheme;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // fall through to the default
  }
  return DEFAULT_THEME;
};

const getServerTheme = (): Theme => DEFAULT_THEME;

const subscribeTheme = (onChange: () => void) => {
  themeListeners.add(onChange);
  // Follow changes made in another tab as well.
  window.addEventListener("storage", onChange);
  return () => {
    themeListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
};

const writeTheme = (next: Theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, next);
    sessionTheme = null;
  } catch {
    sessionTheme = next;
  }
  themeListeners.forEach((listener) => listener());
};

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";

const getServerSystemTheme = (): ResolvedTheme => "dark";

const subscribeSystemTheme = (onChange: () => void) => {
  const media = window.matchMedia(SYSTEM_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
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
 * The colours come from the `--skeleton-base` / `--skeleton-highlight`
 * tokens in globals.css, which `:root` (light) and `.dark` each define, so
 * they flip with the `.dark` class like the rest of the nb-gray ramp and
 * stay in step with the desktop client's skeleton tokens.
 */
function ThemedSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme
      baseColor={"rgb(var(--skeleton-base))"}
      highlightColor={"rgb(var(--skeleton-highlight))"}
    >
      {children}
    </SkeletonTheme>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    getServerTheme,
  );
  const systemTheme = React.useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    getServerSystemTheme,
  );

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  React.useEffect(() => {
    const root = document.documentElement;
    // The pre-paint script in AppLayout usually has this right already;
    // skip the transition freeze when nothing needs to change.
    if (
      root.classList.contains("dark") === (resolvedTheme === "dark") &&
      root.style.colorScheme === resolvedTheme
    ) {
      return;
    }
    withTransitionsDisabled(() => {
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.style.colorScheme = resolvedTheme;
    });
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => writeTheme(next), []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemedSkeleton>{children}</ThemedSkeleton>
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
