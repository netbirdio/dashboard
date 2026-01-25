"use client";

import { cn } from "@utils/helpers";
import { ArrowUpCircle } from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import useFetchApi from "@utils/api";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { VersionInfo as VersionInfoType } from "@/interfaces/Instance";

function formatVersion(version: string): string {
  if (!version) return "";
  // Add "v" prefix if version starts with a number
  if (/^\d/.test(version)) return `v${version}`;
  return version;
}

function compareVersions(current: string, latest: string): boolean {
  // Returns true if latest is newer than current
  if (!current || !latest) return false;
  if (current === "development") return false;

  const currentParts = current.split(".").map((p) => parseInt(p, 10) || 0);
  const latestParts = latest.split(".").map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export const NavigationVersionInfo = () => {
  const { isNavigationCollapsed, mobileNavOpen } = useApplicationContext();

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
  const { data: versionInfo, isLoading } = useFetchApi<VersionInfoType>(
    "/instance/version",
    true, // ignore errors
    false, // don't revalidate on focus
  );

  const dashboardVersion =
    process.env.NEXT_PUBLIC_DASHBOARD_VERSION || "development";

  if (isLoading)
    return <Skeleton height={80} className={"rounded-lg opacity-60"} />;

  if (!versionInfo) return null;

  const managementUpdateAvailable = compareVersions(
    versionInfo.management_current_version,
    versionInfo.management_version,
  );

  return (
    <div
      className={cn(
        "w-full rounded-md text-xs flex flex-col gap-2 whitespace-normal border text-left",
        "bg-nb-gray-900/20 py-3 px-3 border-nb-gray-800/30",
      )}
    >
      {managementUpdateAvailable && (
        <div className="flex items-center gap-1.5 text-green-500 font-medium">
          <ArrowUpCircle size={12} />
          <span>Update available</span>
        </div>
      )}

      <div className="flex flex-col gap-1 text-nb-gray-400">
        <div className="flex items-center justify-between">
          <span>Management</span>
          <span className="text-nb-gray-300 font-medium">
            {formatVersion(versionInfo.management_current_version)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Dashboard</span>
          <span className="text-nb-gray-300 font-medium">
            {formatVersion(dashboardVersion)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NavigationVersionInfo;