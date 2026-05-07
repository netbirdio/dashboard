import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

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
 * Supported starting from Cloink v0.60.0+.
 * @param version
 */
export const isNativeSSHSupported = (version: string) => {
  if (version == "development") return true;
  return compareVersions(version, "0.60.0");
};

/**
 * Check if NetBird SSH protocol is supported.
 * Supported starting from NetBird v0.61.0+.
 * @param version
 */
export const isNetbirdSSHProtocolSupported = (version: string) => {
  if (version == "development") return true;
  return compareVersions(version, "0.61.0");
};
