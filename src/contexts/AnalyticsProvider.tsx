import loadConfig from "@utils/config";
import { isProduction } from "@utils/netbird";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import ReactGA from "react-ga4";
import { hotjar } from "react-hotjar";

type Props = {
  children: React.ReactNode;
};

declare global {
  interface Window {
    _DATADOG_SYNTHETICS_BROWSER: any;
  }
}

const AnalyticsContext = React.createContext(
  {} as {
    initialized: boolean;
    trackPageView: () => void;
  },
);
const config = loadConfig();

export default function AnalyticsProvider({ children }: Props) {
  const [initialized, setInitialized] = useState(false);
  const path = usePathname();

  useEffect(() => {
    if (initialized || !isProduction()) return;
    const gaid = config.googleAnalyticsID;
    const hjid = config.hotjarTrackID;
    if (gaid) {
      ReactGA.initialize(gaid, {
        gaOptions: {
          anonymize_ip: true,
          send_page_view: false,
        },
      });
    }
    if (hjid && window._DATADOG_SYNTHETICS_BROWSER === undefined) {
      hotjar.initialize(hjid, 6);
    }
    setInitialized(true);
  }, []);

  const trackPageView = () => {
    if (!initialized) return;
    if (!path) return;
    ReactGA.send({ hitType: "pageview", page: path, title: document.title });
  };

  return (
    <AnalyticsContext.Provider value={{ initialized, trackPageView }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export const useAnalytics = () => React.useContext(AnalyticsContext);
