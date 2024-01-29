import { useOidcUser } from "@axa-fr/react-oidc";
import { useApiCall } from "@utils/api";
import { useIsMd } from "@utils/responsive";
import { getLatestNetbirdRelease } from "@utils/version";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { User } from "@/interfaces/User";
import type { NetbirdRelease } from "@/interfaces/Version";

type Props = {
  children: React.ReactNode;
};

const ApplicationContext = React.createContext(
  {} as {
    latestVersion: string | undefined;
    latestUrl: string | undefined;
    toggleMobileNav: () => void;
    mobileNavOpen: boolean;
    user: any;
  },
);

export default function ApplicationProvider({ children }: Props) {
  const [latestRelease, setLatestRelease] = useLocalStorage<
    NetbirdRelease | undefined
  >("netbird-latest-release", undefined);
  const { oidcUser: user } = useOidcUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMd = useIsMd();
  const userRequest = useApiCall<User[]>("/users");

  useEffect(() => {
    userRequest.get().then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide mobile nav when windows gets resized
  useEffect(() => {
    if (isMd) {
      setMobileNavOpen(false);
    }
  }, [isMd]);

  useEffect(() => {
    async function fetchLatestRelease() {
      const release = await getLatestNetbirdRelease(latestRelease);
      setLatestRelease(release);
    }
    fetchLatestRelease().then();
    const interval = setInterval(
      fetchLatestRelease,
      1000 * 60 * 30, // Run every 30 minutes
    );
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestVersion = useMemo(
    () => latestRelease?.latest_version,
    [latestRelease],
  );
  const latestUrl = useMemo(() => latestRelease?.url, [latestRelease]);

  const toggleMobileNav = () => {
    setMobileNavOpen(!mobileNavOpen);
  };

  return (
    <ApplicationContext.Provider
      value={{ latestVersion, toggleMobileNav, latestUrl, mobileNavOpen, user }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplicationContext() {
  return useContext(ApplicationContext);
}
