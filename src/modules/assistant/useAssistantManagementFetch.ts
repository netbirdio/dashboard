import loadConfig from "@utils/config";
import { useCallback, useRef } from "react";
import { useSWRConfig } from "swr";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import type { ManagementFetch } from "@/modules/assistant";
import { mergeUrlParams, useNetBirdFetch } from "@/utils/api";

/**
 * The assistant's account reads, made here with the user's own session, so the
 * assistant service never holds their token. The SDK cuts each result to its
 * field allowlist and tokenises it before anything leaves the browser.
 */
export function useAssistantManagementFetch(): ManagementFetch {
  // Errors go back to the assistant as a status, not as a toast or a login redirect.
  const { fetch } = useNetBirdFetch(true);
  const { globalApiParams } = useApplicationContext();
  const { cache } = useSWRConfig();

  // Read at request time: the SDK captures the reader once per conversation,
  // while the token and the selected account change behind it.
  const latest = useRef({ fetch, globalApiParams, cache });
  // eslint-disable-next-line react-hooks/refs -- deliberate: see above
  latest.current = { fetch, globalApiParams, cache };

  return useCallback(async (path, query, options) => {
    const { fetch, globalApiParams, cache } = latest.current;
    // The SDK names API paths from `/api`; the dashboard's keys start below it.
    const url = path.replace(/^\/api(?=\/)/, "");
    const withQuery = mergeUrlParams(url, query);

    // A page's own SWR key is its bare path, so only an unfiltered read can match it.
    if (options?.preferCache && withQuery === url) {
      const cached = cache.get(url)?.data;
      if (cached !== undefined) return { ok: true, body: cached };
    }

    const res = await fetch(
      `${loadConfig().apiOrigin}/api${mergeUrlParams(withQuery, globalApiParams)}`,
      { method: "GET" },
    );
    if (!res.ok) {
      return { ok: false, status: res.status, statusText: res.statusText };
    }
    return { ok: true, body: await res.json() };
  }, []);
}
