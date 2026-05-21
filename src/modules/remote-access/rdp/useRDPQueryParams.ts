import { useLocalStorage } from "@hooks/useLocalStorage";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface RDPQueryParams {
  peerId: string | null;
  ipVersion: string | null;
}

export function useRDPQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [params, setParams] = useState<RDPQueryParams>({
    peerId: null,
    ipVersion: null,
  });
  const [, setLocalQueryParams] = useLocalStorage("netbird-query-params", "");

  useEffect(() => {
    const peerId = searchParams.get("id");
    const ipVersion = searchParams.get("ip_version");

    // If all params are present in URL, use them
    if (peerId) {
      setParams({ peerId, ipVersion });
      return;
    }

    // Otherwise, try to restore from localStorage
    const storedParams = localStorage.getItem("netbird-query-params");
    if (!storedParams) return;

    // Handle JSON encoded strings from localStorage
    let paramsString = storedParams;
    if (storedParams.startsWith('"') && storedParams.endsWith('"')) {
      try {
        paramsString = JSON.parse(storedParams);
      } catch (e) {
        return;
      }
    }

    const urlParams = new URLSearchParams(paramsString);
    const storedPeerId = urlParams.get("id");
    const storedIpVersion = urlParams.get("ip_version");

    if (storedPeerId) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set("id", storedPeerId);
      if (storedIpVersion) {
        newSearchParams.set("ip_version", storedIpVersion);
      }

      router.replace(`/peer/rdp?${newSearchParams.toString()}`);
      setParams({
        peerId: storedPeerId,
        ipVersion: storedIpVersion,
      });

      // Clear stored params after restoring
      setLocalQueryParams("");
    }
  }, [searchParams, router]);

  return params;
}
