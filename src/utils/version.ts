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
 * Split a version string into its numeric release components.
 *
 * Handles every shape NetBird components report: an optional "v" prefix, semver
 * build metadata ("0.77.0+enterprise.1" on enterprise management builds), a CI
 * build suffix ("0.76.3-31256681241"), and pre-release labels ("0.60.0-rc.1").
 * Everything after the release itself is dropped — build metadata carries no
 * precedence in semver, and a pre-release of X.Y.Z is treated as X.Y.Z so a
 * feature gate keyed on a release also holds for its release candidates.
 *
 * Splitting on "." alone (the previous behaviour) left the suffix inside a
 * component, so "0.77.0+enterprise.1" parsed as [0, 77, 0, 1] — smuggling the
 * build number in as a fourth release component. That ranked today's tags
 * correctly only by coincidence; dropping the suffix removes the guesswork.
 */
const releaseParts = (version: string): number[] =>
  version
    .trim()
    .replace(/^v/i, "")
    .split(/[-+]/, 1)[0]
    .split(".")
    .map((part) => {
      const parsed = parseInt(part, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });

/**
 * Check if a version string carries a numeric release to compare against.
 *
 * Builds made outside the release pipeline don't: the "development" tag of the
 * Go builds, and the commit-stamped builds the mobile clients report
 * ("dev-16f7e1e14"). Neither does a peer that reports no version at all.
 * Feature gates treat all of them as current rather than as release 0.
 */
export const hasReleaseVersion = (version: string): boolean =>
  /^v?\d/i.test(version?.trim() ?? "");

/**
 * Compare semantic versions.
 * Returns true if version >= minVersion.
 */
export const compareVersions = (
  version: string,
  minVersion: string,
): boolean => {
  const vParts = releaseParts(version);
  const minParts = releaseParts(minVersion);

  for (let i = 0; i < Math.max(vParts.length, minParts.length); i++) {
    const vPart = vParts[i] || 0;
    const minPart = minParts[i] || 0;

    if (vPart > minPart) return true;
    if (vPart < minPart) return false;
  }

  return true;
};

/**
 * Returns true when `latest` is a strictly newer release than `current` — i.e.
 * an update is available. Only release components decide: an enterprise build
 * ("0.77.0+enterprise.1") is up to date against the "0.77.0" it was built from,
 * matching how the management server evaluates it server-side.
 *
 * Builds without a release ("development", "dev-16f7e1e14") never report an
 * update, in either position.
 */
export const isNewerVersion = (current: string, latest: string): boolean => {
  if (!hasReleaseVersion(current) || !hasReleaseVersion(latest)) return false;

  const currentParts = releaseParts(current);
  const latestParts = releaseParts(latest);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
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
  if (!hasReleaseVersion(version)) return true;
  return compareVersions(version, "0.36.6");
};

/**
 * Check if the peer's SSH server listens on the standard port 22, which it does
 * starting from NetBird v0.60.0+. Older clients listen on 44338 instead.
 * Access control rules address such a server on 22022, and a legacy one on
 * whichever port the connection uses.
 *
 * Only a version that reports a release older than 0.60.0 is treated as legacy,
 * so development and unreported versions get the current behaviour.
 * @param version
 */
export const usesStandardSSHPort = (version: string) =>
  !hasReleaseVersion(version) || compareVersions(version, "0.60.0");

/**
 * Check if NetBird SSH protocol is supported.
 * Supported starting from NetBird v0.61.0+.
 * @param version
 */
export const isNetbirdSSHProtocolSupported = (version: string) =>
  !hasReleaseVersion(version) || compareVersions(version, "0.61.0");
