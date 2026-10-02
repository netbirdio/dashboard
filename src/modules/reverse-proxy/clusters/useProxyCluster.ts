import { useApiCall } from "@utils/api";
import { useEffect, useRef, useState } from "react";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";

const POLL_INTERVAL_MS = 5_000;

type Options = {
  // Polling stops once this holds for the latest match.
  done: (cluster?: ReverseProxyCluster) => boolean;
  // Upper bound on polls; unbounded when omitted.
  maxAttempts?: number;
};

// useProxyCluster polls the clusters list for the cluster declaring domain,
// right away and then every 5 seconds, until done holds or maxAttempts polls
// have run. It returns the latest match, undefined until the cluster appears.
export function useProxyCluster(
  domain: string | undefined,
  { done, maxAttempts }: Options,
) {
  const clustersRequest = useApiCall<ReverseProxyCluster[]>(
    "/reverse-proxies/clusters",
    true,
  );
  // The request closes over the access token of the render that created it;
  // polling can outlive that token, so each poll takes the latest one.
  const getClusters = useRef(clustersRequest.get);
  useEffect(() => {
    getClusters.current = clustersRequest.get;
  });

  // Keyed by domain so a changed domain never shows the previous cluster.
  const [found, setFound] = useState<{
    domain: string;
    cluster?: ReverseProxyCluster;
  }>();
  const cluster = found?.domain === domain ? found?.cluster : undefined;
  const finished = done(cluster);

  useEffect(() => {
    if (!domain || finished) return;
    let attempts = 0;
    const poll = () => {
      attempts += 1;
      if (maxAttempts && attempts > maxAttempts) {
        clearInterval(timer);
        return;
      }
      getClusters
        .current()
        .then((clusters) =>
          setFound({
            domain,
            cluster: clusters?.find(
              (c) => c.address.toLowerCase() === domain.trim().toLowerCase(),
            ),
          }),
        )
        .catch(() => {
          // Polling failures are retried on the next tick.
        });
    };
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => clearInterval(timer);
  }, [domain, finished, maxAttempts]);

  return cluster;
}
