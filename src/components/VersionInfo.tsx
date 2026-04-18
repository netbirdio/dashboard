"use client";

import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import * as React from "react";
import { isNetBirdHosted } from "@utils/netbird";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useI18n } from "@/i18n/I18nProvider";

function formatVersion(version: string): string {
  if (!version) return "";
  if (/^\d/.test(version)) return `v${version}`;
  return version;
}

export const NavigationVersionInfo = () => {
  const { isNavigationCollapsed, mobileNavOpen } = useApplicationContext();

  if (isNetBirdHosted()) return null;

  return (
    <div
      className={cn(
        "px-4 py-4 animate-fade-in",
        isNavigationCollapsed &&
          !mobileNavOpen &&
          "hidden md:group-hover/navigation:block",
      )}
    >
      <NavigationVersionInfoContent />
    </div>
  );
};

const NavigationVersionInfoContent = () => {
  const { t } = useI18n();

  const dashboardVersion =
    process.env.NEXT_PUBLIC_DASHBOARD_VERSION || "development";

  return (
    <div
      className={cn(
        "w-full rounded-md text-xs flex flex-col gap-2 whitespace-normal border text-left",
        "bg-nb-gray-900/20 py-3 px-3 border-nb-gray-800/30",
      )}
    >
      <div className="flex flex-col gap-1 text-nb-gray-400">
        <FullTooltip
          content={
            <span className="text-xs">
              {t("versionInfo.dashboard")}
            </span>
          }
          side="top"
          className="w-full"
        >
          <div className="flex items-center justify-between w-full cursor-default">
            <span>{t("versionInfo.dashboard")}</span>
            <span className="text-nb-gray-300 font-medium">
              {formatVersion(dashboardVersion)}
            </span>
          </div>
        </FullTooltip>
      </div>
    </div>
  );
};

export default NavigationVersionInfo;
