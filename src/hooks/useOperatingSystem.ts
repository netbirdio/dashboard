"use client";

import { OperatingSystem } from "@/interfaces/OperatingSystem";

export default function useOperatingSystem() {
  const isBrowser = typeof window !== "undefined";
  const userAgent = isBrowser ? navigator.userAgent.toLowerCase() : "";
  return getOperatingSystem(userAgent);
}

export const getOperatingSystem = (os: string) => {
  if (os.includes("darwin")) return OperatingSystem.APPLE as const;
  if (os.includes("mac")) return OperatingSystem.APPLE as const;
  if (os.includes("android")) return OperatingSystem.ANDROID as const;
  if (os.includes("ios")) return OperatingSystem.IOS as const;
  if (os.includes("win")) return OperatingSystem.WINDOWS as const;
  return OperatingSystem.LINUX as const;
};
