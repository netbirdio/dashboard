"use client";

import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { ArrowUpCircle } from "lucide-react";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import useFetchApi from "@utils/api";
import { isNetBirdCloud } from "@utils/netbird";
import { isNewerVersion } from "@utils/version";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { VersionInfo as VersionInfoType } from "@/interfaces/Instance";

function formatVersion(version: string): string {
  if (!version) return "";
  // Add "v" prefix if version starts with a number
  if (/^\d/.test(version)) return `v${version}`;
  return version;
}

// Builds can carry a suffix that overflows the sidebar: semver build metadata
// ("0.77.0+enterprise.1" on enterprise builds) or a numeric CI build number
// ("0.76.3-31256681241"). Show the release only and keep the full string for the
// tooltip. Pre-release labels like "-rc.1" are left intact so they stay visible.
function formatShortVersion(version: string): string {
  return formatVersion(version)
    .replace(/\+.*$/, "")
    .replace(/^(v?\d+(?:\.\d+)*)-\d+$/, "$1");
}

export const NavigationVersionInfo = () => {
  const { isNavigationCollapsed, mobileNavOpen } = useApplicationContext();

  // Only show for self-hosted, not cloud
  if (isNetBirdCloud()) return null;

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

  // Prefer the server's verdict: it knows the release channel the installation
  // runs on and compares with a full semver implementation. Fall back to a local
  // comparison for management servers that don't report the flag yet.
  const managementUpdateAvailable =
    versionInfo.management_update_available ??
    isNewerVersion(
      versionInfo.management_current_version,
      versionInfo.management_available_version,
    );
  // The dashboard's installed version is baked in at build time and the server
  // never sees it, so this one is always compared here.
  const dashboardUpdateAvailable = isNewerVersion(
    dashboardVersion,
    versionInfo.dashboard_available_version,
  );
  const hasUpdate = managementUpdateAvailable || dashboardUpdateAvailable;

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
            <div className="text-xs flex flex-col gap-1">
              <span>
                Installed:{" "}
                {formatVersion(versionInfo.management_current_version)}
              </span>
              <span>
                Latest: {formatVersion(versionInfo.management_available_version)}
              </span>
            </div>
          }
          side="top"
          className="w-full"
        >
          <div className="flex items-center justify-between w-full cursor-default">
            <span>Management</span>
            <span className="text-nb-gray-300 font-medium">
              {formatShortVersion(versionInfo.management_current_version)}
            </span>
          </div>
        </FullTooltip>
        <FullTooltip
          content={
            <div className="text-xs flex flex-col gap-1">
              <span>Installed: {formatVersion(dashboardVersion)}</span>
              <span>
                Latest: {formatVersion(versionInfo.dashboard_available_version)}
              </span>
            </div>
          }
          side="top"
          className="w-full"
        >
          <div className="flex items-center justify-between w-full cursor-default">
            <span>Dashboard</span>
            <span className="text-nb-gray-300 font-medium">
              {formatShortVersion(dashboardVersion)}
            </span>
          </div>
        </FullTooltip>
      </div>

      {hasUpdate && (
        <a
          href="https://docs.netbird.io/selfhosted/maintenance/upgrade"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-white font-medium bg-netbird hover:bg-netbird-500 transition-colors rounded-md py-1.5 px-2 mt-1"
        >
          <ArrowUpCircle size={12} />
          <span>Update available</span>
        </a>
      )}
    </div>
  );
};

export default NavigationVersionInfo;
