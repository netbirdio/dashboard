import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

export const NavigationEvents = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analytics = useAnalytics();

  useEffect(() => {
    //const url = `${pathname}?${searchParams}`;
    if (analytics && analytics.initialized) analytics.trackPageView();
  }, [pathname, searchParams]);

  return null;
};
