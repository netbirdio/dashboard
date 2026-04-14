import { useLocalStorage } from "@hooks/useLocalStorage";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export interface VNCSettings {
  scale: boolean;
  resize: boolean;
  quality: number; // 0-9, noVNC quality level
  dotCursor: boolean;
}

interface VNCQueryParams {
  peerId: string | null;
  mode: "attach" | "session";
  username: string;
  settings: VNCSettings;
}

const defaultSettings: VNCSettings = {
  scale: true,
  resize: false,
  quality: 6,
  dotCursor: true,
};

export function useVNCQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [params, setParams] = useState<VNCQueryParams>({
    peerId: null,
    mode: "attach",
    username: "",
    settings: defaultSettings,
  });
  const [, setLocalQueryParams] = useLocalStorage("netbird-query-params", "");

  useEffect(() => {
    const peerId = searchParams.get("id");
    const mode = (searchParams.get("mode") as "attach" | "session") || "attach";
    const username = searchParams.get("user") || "";

    const settings: VNCSettings = {
      scale: searchParams.get("scale") !== "false",
      resize: searchParams.get("resize") === "true",
      quality: parseInt(searchParams.get("quality") || "6", 10),
      dotCursor: searchParams.get("cursor") !== "false",
    };

    if (peerId) {
      setParams({ peerId, mode, username, settings });
      return;
    }

    // Restore from localStorage after auth redirect.
    const storedParams = localStorage.getItem("netbird-query-params");
    if (!storedParams) return;

    let paramsString = storedParams;
    if (storedParams.startsWith('"') && storedParams.endsWith('"')) {
      try {
        paramsString = JSON.parse(storedParams);
      } catch {
        return;
      }
    }

    const urlParams = new URLSearchParams(paramsString);
    const storedPeerId = urlParams.get("id");

    if (storedPeerId) {
      const newSearchParams = new URLSearchParams();
      newSearchParams.set("id", storedPeerId);

      router.replace(`/peer/vnc?${newSearchParams.toString()}`);
      setParams({ peerId: storedPeerId, mode: "attach", username: "", settings: defaultSettings });
      setLocalQueryParams("");
    }
  }, [searchParams, router]);

  return params;
}
