"use client";

import { OperatingSystem } from "@/interfaces/OperatingSystem";

/**
 * Get the operating system of the user based on the user agent of the browser
 * This is used for the setup modal to show the correct installation guide
 */
export default function useOperatingSystem() {
  const isBrowser = typeof window !== "undefined";
  const userAgent = isBrowser ? navigator.userAgent.toLowerCase() : "";
  const iOS = isBrowser
    ? /(iP*)/g.test(navigator.userAgent) && navigator.maxTouchPoints > 2
    : false;
  if (iOS) return OperatingSystem.IOS;
  // For FreeBSD, we return Linux as we currently don't have an official installation guide for FreeBSD
  if (userAgent.toLowerCase().includes("freebsd")) return OperatingSystem.LINUX;
  return getOperatingSystem(userAgent);
}

/**
 * Get the operating system based on a string (user agent, api response, etc.)
 * Falls back to Linux if the operating system is not recognized
 */
export const getOperatingSystem = (os: string) => {
  if (!os) return OperatingSystem.LINUX as const;
  if (os.toLowerCase().includes("freebsd"))
    return OperatingSystem.FREEBSD as const;
  if (os.toLowerCase().includes("darwin"))
    return OperatingSystem.APPLE as const;
  if (os.toLowerCase().includes("mac")) return OperatingSystem.APPLE as const;
  if (os.toLowerCase().includes("android"))
    return OperatingSystem.ANDROID as const;
  if (os.toLowerCase().includes("ios")) return OperatingSystem.IOS as const;
  if (os.toLowerCase().includes("ipad")) return OperatingSystem.IOS as const;
  if (os.toLowerCase().includes("iphone")) return OperatingSystem.IOS as const;
  if (os.toLowerCase().includes("windows"))
    return OperatingSystem.WINDOWS as const;
  return OperatingSystem.LINUX as const;
};
