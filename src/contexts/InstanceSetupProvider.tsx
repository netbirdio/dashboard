"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";
import FullScreenLoading from "@/components/ui/FullScreenLoading";
import { fetchInstanceStatus } from "@/utils/unauthenticatedApi";
import { isNetBirdHosted } from "@utils/netbird";

interface InstanceSetupContextType {
  setupRequired: boolean;
  loading: boolean;
}

const InstanceSetupContext = createContext<InstanceSetupContextType>({
  setupRequired: false,
  loading: true,
});

export const useInstanceSetup = () => useContext(InstanceSetupContext);

// Check if we're in an OIDC callback flow (hash-based routing)
const isOIDCCallback = () => {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.startsWith("#callback") || hash.startsWith("#silent-callback");
};

export default function InstanceSetupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Routes that don't need setup check
  const bypassRoutes = ["/install"];
  const shouldBypass = bypassRoutes.includes(pathname) || isOIDCCallback();

  // Skip setup check for NetBird hosted (cloud) deployments
  const isCloud = isNetBirdHosted();

  // Check instance status on mount
  useEffect(() => {
    // Skip check for cloud deployments or bypass routes
    if (isCloud || shouldBypass) {
      setLoading(false);
      return;
    }

    // Check if instance setup is required
    fetchInstanceStatus()
      .then((status) => {
        if (status.setup_required) {
          setSetupRequired(true);
        }
      })
      .catch((err) => {
        // If API fails (e.g., endpoint doesn't exist on older versions),
        // assume setup is not required and continue normally
        console.warn("Instance status check failed:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [shouldBypass, isCloud]);

  // Handle redirect separately to avoid setState during render conflicts
  useEffect(() => {
    if (setupRequired && !shouldBypass && pathname !== "/setup") {
      router.replace("/setup");
    }
  }, [setupRequired, shouldBypass, router]);

  // Show loading while checking (only for non-cloud, non-bypass routes)
  if (loading && !shouldBypass && !isCloud) {
    return <FullScreenLoading />;
  }

  // If setup required and not on setup page, wait for redirect
  if (setupRequired && !shouldBypass) {
    return <FullScreenLoading />;
  }

  return (
    <InstanceSetupContext.Provider value={{ setupRequired, loading }}>
      {children}
    </InstanceSetupContext.Provider>
  );
}
