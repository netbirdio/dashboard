import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function useUrlTab(
  validTabs: string[],
  defaultTab: string,
  paramName: string = "tab",
): [string, (value: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();

  const getTab = useCallback(
    (params: URLSearchParams) => {
      const tabParam = params.get(paramName);
      if (tabParam && validTabs.includes(tabParam)) return tabParam;
      return defaultTab;
    },
    [validTabs, defaultTab, paramName],
  );

  const tab = useMemo(() => getTab(searchParams), [searchParams, getTab]);

  const setTab = useCallback(
    (value: string) => {
      const nextTab = validTabs.includes(value) ? value : defaultTab;
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, nextTab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, validTabs, defaultTab, paramName],
  );

  return [tab, setTab];
}
