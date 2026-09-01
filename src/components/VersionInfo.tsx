"use client";

import FullTooltip from "@components/FullTooltip";
import { SmallBadge } from "@components/ui/SmallBadge";
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

// A pre-release label names the release itself, so it stays in the short form.
// Anything else after the release names the build and is dropped.
const PRERELEASE_LABEL = /^(rc|alpha|beta)[\w.]*$/i;

// A goreleaser snapshot is built from an unreleased tree and versioned as the
// NEXT release ("0.77.1-SNAPSHOT-a1b2c3d" is built after 0.77.0 shipped), so
// showing the number alone would name a release this build is not. The number
// still gets shortened — the commit is what overflows — and the badge beside
// it says which kind of build it came from.
const SNAPSHOT_SUFFIX = /-snapshot\b/i;

function isSnapshotVersion(version: string): boolean {
  return SNAPSHOT_SUFFIX.test(version);
}

// Builds can carry a suffix that overflows the sidebar: semver build metadata
// ("0.77.0+enterprise.1" on enterprise builds), a numeric CI build number
// ("0.76.3-31256681241"), or a goreleaser snapshot tag
// ("0.60.1-SNAPSHOT-a1b2c3d"). Show the release only and keep the full string
// for the tooltip. A version that is not a release at all ("development",
// "ci-7470fbdd") has nothing to shorten and passes through as it is.
function formatShortVersion(version: string): string {
  const formatted = formatVersion(version).replace(/\+.*$/, "");
  const release = /^(v?\d+(?:\.\d+)*)(?:-(.+))?$/.exec(formatted);
  if (!release) return formatted;
  const [, numbers, suffix] = release;
  return suffix && PRERELEASE_LABEL.test(suffix)
    ? `${numbers}-${suffix}`
    : numbers;
}

// The right-hand side of a row: the shortened number, plus a marker when the
// build is not the release that number names.
function VersionValue({ version }: { version: string }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="text-nb-gray-300 font-medium truncate">
        {formatShortVersion(version)}
      </span>
      {isSnapshotVersion(version) && (
        <SmallBadge
          text={"SNAPSHOT"}
          variant={"yellow"}
          size={"md"}
          className={"shrink-0"}
        />
      )}
    </span>
  );
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
                Latest:{" "}
                {formatVersion(versionInfo.management_available_version)}
              </span>
            </div>
          }
          side="top"
          className="w-full"
        >
          <div className="flex items-center justify-between w-full cursor-default gap-2">
            <span className="shrink-0">Management</span>
            <VersionValue version={versionInfo.management_current_version} />
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
          <div className="flex items-center justify-between w-full cursor-default gap-2">
            <span className="shrink-0">Dashboard</span>
            <VersionValue version={dashboardVersion} />
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
