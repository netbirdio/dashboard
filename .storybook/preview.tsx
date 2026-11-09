import "../src/app/globals.css";
import { setApiOverrides } from "./mocks/api";
import type { Preview } from "@storybook/nextjs-vite";
import { TooltipProvider } from "@components/Tooltip";
import { MotionConfig } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localFont from "next/font/local";
import React from "react";
import { SWRConfig } from "swr";
import DialogProvider from "@/contexts/DialogProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";

dayjs.extend(relativeTime);

const inter = localFont({
  src: "../src/assets/fonts/Inter.ttf",
  display: "block",
});

/* ThemeProvider reads the theme from localStorage, the same as the app,
   so the toolbar writes it there and the html class is set before render
   to avoid a frame in the wrong theme. */
const withTheme = (
  Story: React.ComponentType,
  context: {
    id: string;
    globals: { theme?: string };
    parameters: { api?: Record<string, unknown> };
  },
) => {
  const theme = context.globals.theme ?? "dark";
  setApiOverrides(context.parameters.api);
  // Table filters, the collapsed sidebar and first-run flags persist in
  // localStorage and would otherwise leak from one story into the next.
  Object.keys(localStorage)
    .filter((key) => key.startsWith("netbird-"))
    .forEach((key) => localStorage.removeItem(key));
  localStorage.setItem("netbird-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  document.body.className = inter.className;
  return (
    // A fresh SWR cache per story, so per-story API overrides aren't
    // shadowed by data another story already loaded.
    // framer-motion animates in JS, out of reach of the CSS freeze in capture.mjs.
    <SWRConfig
      key={`${context.id}-${theme}`}
      value={{ provider: () => new Map() }}
    >
      <MotionConfig reducedMotion={"always"}>
        <DialogProvider>
          <ThemeProvider>
            <TooltipProvider delayDuration={0}>
              <div className={"bg-nb-gray min-h-screen text-nb-gray-100"}>
                <Story />
              </div>
            </TooltipProvider>
          </ThemeProvider>
        </DialogProvider>
      </MotionConfig>
    </SWRConfig>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: { theme: "dark", flavor: "selfhosted" },
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark" },
          { value: "light", title: "Light" },
        ],
        dynamicTitle: true,
      },
    },
    // Read once from the URL by mocks/config.ts; reload the preview after switching.
    flavor: {
      description: "Self-hosted or NetBird Cloud",
      toolbar: {
        icon: "cloud",
        items: [
          { value: "selfhosted", title: "Self-hosted" },
          { value: "cloud", title: "Cloud" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
};

export default preview;
