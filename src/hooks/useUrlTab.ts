import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function useUrlTab(
  validTabs: string[],
  defaultTab: string,
): [string, (value: string) => void] {
  const searchParams = useSearchParams();

  const getTab = useCallback(
    (params: URLSearchParams) => {
      const tabParam = params.get("tab");
      if (tabParam && validTabs.includes(tabParam)) return tabParam;
      return defaultTab;
    },
    [validTabs, defaultTab],
  );

  const [tab, setTabState] = useState(() => getTab(searchParams));

  useEffect(() => {
    const newTab = getTab(searchParams);
    setTabState(newTab);
  }, [searchParams, getTab]);

  const setTab = useCallback((value: string) => {
    setTabState(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, []);

  return [tab, setTab];
}
