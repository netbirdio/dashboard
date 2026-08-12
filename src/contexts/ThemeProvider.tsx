"use client";

import "react-loading-skeleton/dist/skeleton.css";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { SkeletonTheme } from "react-loading-skeleton";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = Exclude<Theme, "system">;

const STORAGE_KEY = "netbird-theme";
const DEFAULT_THEME: ResolvedTheme = "dark";
const THEME_CLASSES: ResolvedTheme[] = ["dark", "light"];

type Props = {
  children: React.ReactNode;
};

const ThemeContext = React.createContext(
  {} as {
    theme: Theme;
    setTheme: (theme: Theme) => void;
  },
);

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

// storedTheme reads the persisted preference. Access to localStorage can throw
// when the browser blocks storage, in which case we fall back to the default.
function storedTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }: Props) {
  // The theme class ships on <html> in the static export, so the initial paint
  // never flashes. Reading storage here only matters when the stored preference
  // differs from that default.
  const [theme, setThemeState] = useState<Theme>(storedTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference is not persisted when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme);
      const root = document.documentElement;
      root.classList.remove(...THEME_CLASSES.filter((c) => c !== resolved));
      root.classList.add(resolved);
      root.style.colorScheme = resolved;
    };

    apply();

    if (theme !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: light)");
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <SkeletonTheme baseColor={"#25282d"} highlightColor={"#33373e"}>
        {children}
      </SkeletonTheme>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
