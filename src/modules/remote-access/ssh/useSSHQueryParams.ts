import { useLocalStorage } from "@hooks/useLocalStorage";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SSHQueryParams {
  peerId: string | null;
  username: string | null;
  port: string | null;
  ipVersion: string | null;
}

export function useSSHQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [params, setParams] = useState<SSHQueryParams>({
    peerId: null,
    username: null,
    port: null,
    ipVersion: null,
  });
  const [, setLocalQueryParams] = useLocalStorage("netbird-query-params", "");

  useEffect(() => {
    const peerId = searchParams.get("id");
    const username = searchParams.get("user");
    const port = searchParams.get("port");
    const ipVersion = searchParams.get("ip_version");

    // If all params are present in URL, use them
    if (peerId && username && port) {
      setParams({ peerId, username, port, ipVersion });
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
    const storedUsername = urlParams.get("user");
    const storedPort = urlParams.get("port");
    const storedIpVersion = urlParams.get("ip_version");

    if (storedPeerId && storedUsername && storedPort) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set("id", storedPeerId);
      newSearchParams.set("user", storedUsername);
      newSearchParams.set("port", storedPort);
      if (storedIpVersion) {
        newSearchParams.set("ip_version", storedIpVersion);
      }

      router.replace(`/peer/ssh?${newSearchParams.toString()}`);
      setParams({
        peerId: storedPeerId,
        username: storedUsername,
        port: storedPort,
        ipVersion: storedIpVersion,
      });

      // Clear stored params after restoring
      setLocalQueryParams("");
    }
  }, [searchParams, router]);

  return params;
}
