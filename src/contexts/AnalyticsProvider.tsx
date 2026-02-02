import loadConfig from "@utils/config";
import { isProduction } from "@utils/netbird";
import { usePathname } from "next/navigation";
import Script from "next/script";
import React, { useEffect, useState } from "react";
import ReactGA from "react-ga4";
import { hotjar } from "react-hotjar";

type Props = {
  children: React.ReactNode;
};

declare global {
  interface Window {
    _DATADOG_SYNTHETICS_BROWSER: any;
    dataLayer: any[];
  }
}

export type HubspotFormField = {
  objectTypeId?: string;
  name: string;
  value: string;
};

const AnalyticsContext = React.createContext(
  {} as {
    initialized: boolean;
    trackPageView: () => void;
    trackEvent: (category: string, action: string, label: string) => void;
    trackEventV2: (
      category: string,
      name: string,
      value?: string,
      userID?: string,
    ) => void;
    trackGTMCustomEvent: (name: string) => void;
  },
);
const config = loadConfig();

export default function AnalyticsProvider({ children }: Readonly<Props>) {
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
      hotjar.initialize({ id: hjid, sv: 6 });
    }
    setInitialized(true);
  }, []);

  const trackPageView = () => {
    if (!initialized) return;
    if (!path) return;
    ReactGA.send({ hitType: "pageview", page: path, title: document.title });
  };

  const trackEvent = (category: string, action: string, label: string) => {
    if (isProduction() && ReactGA.isInitialized) {
      ReactGA.event({
        category: category,
        action: action,
        label: label,
      });
    }
  };

  const trackEventV2 = (
    category: string,
    name: string,
    value?: string,
    userID?: string,
  ) => {
    // Track custom event
    if (isProduction() && ReactGA.isInitialized) {
      ReactGA.event("nb_event", {
        category: category,
        action: name,
        value: value,
        userID: userID,
      });
    }
  };

  const trackGTMCustomEvent = (name: string) => {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: name,
      });
    } catch (e) {}
  };

  return (
    <AnalyticsContext.Provider
      value={{
        initialized,
        trackPageView,
        trackEvent,
        trackEventV2,
        trackGTMCustomEvent,
      }}
    >
      <GoogleTageManagerBodyScript />
      {children}
    </AnalyticsContext.Provider>
  );
}

export const GoogleTagManagerHeadScript = () => {
  if (!config.googleTagManagerID) return null;
  return (
    isProduction() && (
      <Script id="gtm-script" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': 
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
       })(window,document,'script','dataLayer','${config.googleTagManagerID}');`}
      </Script>
    )
  );
};

const GoogleTageManagerBodyScript = () => {
  if (!config.googleTagManagerID) return null;
  return (
    isProduction() && (
      <noscript>
        <iframe
          title={"Google Tag Manager"}
          src={`https://www.googletagmanager.com/ns.html?id=${config.googleTagManagerID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    )
  );
};

export const useAnalytics = () => React.useContext(AnalyticsContext);
