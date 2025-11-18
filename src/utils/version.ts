import { getOperatingSystem } from "@hooks/useOperatingSystem";
import dayjs from "dayjs";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { NetbirdRelease } from "@/interfaces/Version";

const GITHUB_API_ENDPOINT = "https://api.github.com";
const LATEST_RELEASE_CHECK_INTERVAL_IN_MINUTES = 10;

export const getLatestNetbirdRelease = async (
  release?: NetbirdRelease,
): Promise<NetbirdRelease | undefined> => {
  const runFetch =
    release === undefined ||
    release.last_checked === undefined ||
    dayjs(release.last_checked).isBefore(
      dayjs().subtract(LATEST_RELEASE_CHECK_INTERVAL_IN_MINUTES, "minute"),
    );

  if (runFetch) {
    const data = (await fetch(
      `${GITHUB_API_ENDPOINT}/repos/netbirdio/netbird/releases/latest`,
    ).then((response) => response.json())) as any;

    try {
      return {
        latest_version: data.name,
        last_checked: new Date(),
        url: data.html_url as string,
      } as NetbirdRelease;
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  } else {
    return release;
  }
};

/**
 * Compare semantic versions.
 * Returns true if version >= minVersion.
 */
export const compareVersions = (
  version: string,
  minVersion: string,
): boolean => {
  const parseVersion = (v: string): number[] => {
    return v.replace(/^v/, "").split(".").map(Number);
  };

  const vParts = parseVersion(version);
  const minParts = parseVersion(minVersion);

  for (let i = 0; i < Math.max(vParts.length, minParts.length); i++) {
    const vPart = vParts[i] || 0;
    const minPart = minParts[i] || 0;

    if (vPart > minPart) return true;
    if (vPart < minPart) return false;
  }

  return true;
};

/**
 * Check if peer as routing peer is supported by the provided version and operating system.
 * Routing peers are supported on Windows, macOS, iOS & Android starting from NetBird v0.36.6+.
 * @param version
 * @param os
 */
export const isRoutingPeerSupported = (version: string, os: string) => {
  const operatingSystem = getOperatingSystem(os);
  if (operatingSystem == OperatingSystem.LINUX) return true;
  if (version == "development") return true;
  return compareVersions(version, "0.36.6");
};

/**
 * Check if native SSH is supported.
 * Supported starting from NetBird v0.60.0+.
 * @param version
 */
export const isNativeSSHSupported = (version: string) => {
  if (version == "development") return true;
  return compareVersions(version, "0.60.0");
};
