"use client";

import { OperatingSystem } from "@/interfaces/OperatingSystem";

export default function useOperatingSystem() {
  const isBrowser = typeof window !== "undefined";
  const userAgent = isBrowser ? navigator.userAgent.toLowerCase() : "";
  const iOS = isBrowser
    ? /(iP*)/g.test(navigator.userAgent) && navigator.maxTouchPoints > 2
    : false;
  if (iOS) return OperatingSystem.IOS;
  return getOperatingSystem(userAgent);
}

export const getOperatingSystem = (os: string) => {
  if (os.toLowerCase().includes("darwin"))
    return OperatingSystem.APPLE as const;
  if (os.toLowerCase().includes("mac")) return OperatingSystem.APPLE as const;
  if (os.toLowerCase().includes("android"))
    return OperatingSystem.ANDROID as const;
  if (os.toLowerCase().includes("ios")) return OperatingSystem.IOS as const;
  if (os.toLowerCase().includes("windows"))
    return OperatingSystem.WINDOWS as const;
  return OperatingSystem.LINUX as const;
};
