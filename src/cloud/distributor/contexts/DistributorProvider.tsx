import useFetchApi from "@utils/api";
import { isNetBirdCloud } from "@utils/netbird";
import React, { useEffect, useMemo } from "react";
import { Distributor } from "@/cloud/distributor/interfaces/Distributor";

type Props = {
  children: React.ReactNode;
};

const DISTRIBUTOR_HIDDEN_NAV_ITEMS = [
  "/control-center",
  "/setup-keys",
  "/access-control",
  "/networks",
  "/network-routes",
  "/reverse-proxy",
  "/dns",
  "/team",
  "/events",
  "/tenants",
  "/peers",
];

const DISTRIBUTOR_HIDDEN_SETTINGS_TABS = [
  "networks",
  "clients",
  "groups",
  "edr",
];

const DISTRIBUTOR_HIDDEN_AUTH_SETTINGS = [
  "peer-approval",
  "peer-session-expiration",
];

const DistributorContext = React.createContext(
  {} as {
    distributorInfo?: Distributor;
    isDistributorInfoLoading: boolean;
    isActive: boolean;
  },
);

export default function DistributorProvider({ children }: Readonly<Props>) {
  // Distributor (reseller) data lives behind an MSP endpoint that only NetBird
  // Cloud serves. Skip the call on self-hosted deployments.
  const {
    data: distributorInfo,
    isLoading: isDistributorInfoLoading,
    error,
  } = useFetchApi<Distributor>(
    "/integrations/msp/reseller",
    true,
    true,
    isNetBirdCloud(),
  );

  const isActive = useMemo(() => {
    try {
      if (isDistributorInfoLoading || distributorInfo === undefined || error)
        return false;
      if (!Object.hasOwn(distributorInfo, "activated_at")) return false;
      return distributorInfo.activated_at !== "";
    } catch (err) {
      return false;
    }
  }, [isDistributorInfoLoading, distributorInfo, error]);

  useEffect(() => {
    if (isActive) {
      document.body.setAttribute("data-distributor", "");

      const style = document.createElement("style");
      style.setAttribute("data-distributor-styles", "");
      const navRules = DISTRIBUTOR_HIDDEN_NAV_ITEMS.map(
        (href) =>
          `body[data-distributor] [data-nav-item="${href}"]:not([data-distributor-nav] *)`,
      );
      const settingsRules = DISTRIBUTOR_HIDDEN_SETTINGS_TABS.map(
        (tab) => `body[data-distributor] [data-settings-tab="${tab}"]`,
      );
      const authRules = DISTRIBUTOR_HIDDEN_AUTH_SETTINGS.map(
        (setting) => `body[data-distributor] [data-auth-setting="${setting}"]`,
      );
      const hideRules =
        [...navRules, ...settingsRules, ...authRules].join(",\n") +
        " { display: none; }";
      const overrideRules = `body[data-distributor] [data-auth-setting="toggles"] { margin-top: 1rem; }`;
      style.textContent = hideRules + "\n" + overrideRules;
      document.head.appendChild(style);

      return () => {
        document.body.removeAttribute("data-distributor");
        style.remove();
      };
    }
  }, [isActive]);

  return (
    <DistributorContext.Provider
      value={{
        distributorInfo,
        isDistributorInfoLoading,
        isActive,
      }}
    >
      {children}
    </DistributorContext.Provider>
  );
}

export function useDistributor() {
  return React.useContext(DistributorContext);
}
