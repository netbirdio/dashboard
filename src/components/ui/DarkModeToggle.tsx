"use client";

import { cn } from "@utils/helpers";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { type Theme, useTheme } from "@/contexts/ThemeProvider";

const OPTIONS: {
  value: Theme;
  label: string;
  icon: typeof SunIcon;
}[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

/* Segmented theme switcher rendered as a footer row inside the
   profile dropdown. Plain buttons (not DropdownMenuItem) so picking
   a theme doesn't close the menu. */
export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={
        "flex items-center justify-between gap-3 pl-3 pr-2 py-1.5 text-sm"
      }
    >
      <span className={"text-nb-gray-300"}>Theme</span>
      <div className={"flex items-center gap-1"}>
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type={"button"}
            title={label}
            aria-label={`${label} theme`}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              theme === value
                ? "bg-nb-gray-900 text-nb-gray-100"
                : "text-nb-gray-400 hover:bg-nb-gray-900 hover:text-nb-gray-100",
            )}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
