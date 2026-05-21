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
  // ready is true once we've attempted to resolve query params (including
  // any localStorage restore after auth redirect). Callers can use this to
  // distinguish "still initializing" from "no peer id available".
  ready: boolean;
}

const defaultSettings: VNCSettings = {
  scale: true,
  resize: false,
  quality: 6,
  dotCursor: true,
};

const allowedModes = ["attach", "session"] as const;
type Mode = (typeof allowedModes)[number];

function parseMode(raw: string | null): Mode {
  return (allowedModes as readonly string[]).includes(raw ?? "")
    ? (raw as Mode)
    : "attach";
}

function parseSettings(p: URLSearchParams): VNCSettings {
  const rawQuality = parseInt(p.get("quality") || "", 10);
  const quality = Number.isFinite(rawQuality)
    ? Math.max(0, Math.min(9, rawQuality))
    : defaultSettings.quality;
  return {
    scale: p.get("scale") !== "false",
    resize: p.get("resize") === "true",
    quality,
    dotCursor: p.get("cursor") !== "false",
  };
}

export function useVNCQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [params, setParams] = useState<VNCQueryParams>({
    peerId: null,
    mode: "attach",
    username: "",
    settings: defaultSettings,
    ready: false,
  });
  const [, setLocalQueryParams] = useLocalStorage("netbird-query-params", "");

  useEffect(() => {
    const peerId = searchParams.get("id");
    const mode = parseMode(searchParams.get("mode"));
    const username = searchParams.get("user") || "";
    const settings = parseSettings(new URLSearchParams(searchParams.toString()));

    if (peerId) {
      setParams({ peerId, mode, username, settings, ready: true });
      return;
    }

    // Restore from localStorage after auth redirect.
    const storedParams = localStorage.getItem("netbird-query-params");
    if (!storedParams) {
      setParams((prev) => ({ ...prev, ready: true }));
      return;
    }

    let paramsString = storedParams;
    if (storedParams.startsWith('"') && storedParams.endsWith('"')) {
      try {
        paramsString = JSON.parse(storedParams);
      } catch {
        setParams((prev) => ({ ...prev, ready: true }));
        return;
      }
    }

    const urlParams = new URLSearchParams(paramsString);
    const storedPeerId = urlParams.get("id");

    if (!storedPeerId) {
      setParams((prev) => ({ ...prev, ready: true }));
      return;
    }

    const storedMode = parseMode(urlParams.get("mode"));
    const storedUser = urlParams.get("user") || "";
    const storedSettings = parseSettings(urlParams);

    router.replace(`/peer/vnc?${urlParams.toString()}`);
    setParams({
      peerId: storedPeerId,
      mode: storedMode,
      username: storedUser,
      settings: storedSettings,
      ready: true,
    });
    setLocalQueryParams("");
  }, [searchParams, router, setLocalQueryParams]);

  return params;
}
