import { useLocalStorage } from "@hooks/useLocalStorage";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  ipVersion: string | null;
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
  // Off, matching noVNC's own default. The dot replaces the viewer's local
  // pointer, and a peer that sends no cursor of its own (macOS does not) would
  // leave the dot as the only thing on screen.
  dotCursor: false,
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
    dotCursor: p.get("cursor") === "true",
  };
}

const emptyParams: VNCQueryParams = {
  peerId: null,
  mode: "attach",
  username: "",
  ipVersion: null,
  settings: defaultSettings,
  ready: false,
};

// paramsFrom reads one set of VNC parameters out of a query string.
function paramsFrom(p: URLSearchParams, peerId: string): VNCQueryParams {
  return {
    peerId,
    mode: parseMode(p.get("mode")),
    username: p.get("user") || "",
    ipVersion: p.get("ip_version"),
    settings: parseSettings(p),
    ready: true,
  };
}

export function useVNCQueryParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, setLocalQueryParams] = useLocalStorage("netbird-query-params", "");

  // The ordinary case: the parameters are in the URL, so they are derived
  // during render rather than pushed into state from an effect.
  const fromURL = useMemo(() => {
    const peerId = searchParams.get("id");
    if (!peerId) return null;
    return paramsFrom(new URLSearchParams(searchParams.toString()), peerId);
  }, [searchParams]);

  // The restore case: an auth redirect dropped the query string, so it has to
  // be read back from localStorage and put on the URL again. That genuinely
  // belongs in an effect — localStorage cannot be read during render on a page
  // Next prerenders, and the branch also rewrites the URL and clears the stored
  // value. Only this branch sets state.
  const [restored, setRestored] = useState<VNCQueryParams | null>(null);

  useEffect(() => {
    if (fromURL) return;

    const storedParams = localStorage.getItem("netbird-query-params");
    if (!storedParams) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      setRestored({ ...emptyParams, ready: true });
      return;
    }

    let paramsString = storedParams;
    if (storedParams.startsWith('"') && storedParams.endsWith('"')) {
      try {
        paramsString = JSON.parse(storedParams);
      } catch {
        setRestored({ ...emptyParams, ready: true });
        return;
      }
    }

    const urlParams = new URLSearchParams(paramsString);
    const storedPeerId = urlParams.get("id");
    if (!storedPeerId) {
      setRestored({ ...emptyParams, ready: true });
      return;
    }

    router.replace(`/peer/vnc?${urlParams.toString()}`);

    setRestored(paramsFrom(urlParams, storedPeerId));
    setLocalQueryParams("");
  }, [fromURL, router, setLocalQueryParams]);

  return fromURL ?? restored ?? emptyParams;
}
