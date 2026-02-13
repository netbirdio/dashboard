import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function useUrlTab(
  validTabs: string[],
  defaultTab: string,
): [string, (value: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = useMemo(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    return defaultTab;
  }, [searchParams, validTabs, defaultTab]);

  const setTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return [tab, setTab];
}
