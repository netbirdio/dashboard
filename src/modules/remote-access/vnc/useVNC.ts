import { useCallback, useEffect, useRef, useState } from "react";
import { installVNCWebSocketProxy } from "./websocket-proxy";

export enum VNCStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
  CONNECTING = 2,
}

export type VNCMode = "attach" | "session";

interface VNCConfig {
  hostname: string;
  port: number;
  mode?: VNCMode;
  username?: string;
  jwt?: string;
  sessionID?: number;
  scale?: boolean;
  resize?: boolean;
  quality?: number;
  dotCursor?: boolean;
}

interface VNCClient {
  client?: {
    createVNCProxy: (
      hostname: string,
      port: string,
      mode: string,
      username: string,
      jwt: string,
      sessionID: number,
    ) => Promise<string>;
  };
}

export const useVNC = (client: VNCClient) => {
  const [status, setStatus] = useState(VNCStatus.DISCONNECTED);
  const statusRef = useRef(VNCStatus.DISCONNECTED);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
  const proxyInstalledRef = useRef(false);

  const updateStatus = useCallback((s: VNCStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const disconnect = useCallback(() => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {
        // ignore disconnect errors
      }
      rfbRef.current = null;
    }
    updateStatus(VNCStatus.DISCONNECTED);
  }, [updateStatus]);

  const connect = useCallback(
    async (config: VNCConfig) => {
      if (statusRef.current === VNCStatus.CONNECTING) return;

      updateStatus(VNCStatus.CONNECTING);
      setError("");

      try {
        if (!containerRef.current) {
          throw new Error("VNC container not available");
        }

        if (!client?.client?.createVNCProxy) {
          throw new Error("VNC proxy not available from NetBird client");
        }

        // Install WebSocket proxy if not already done.
        if (!proxyInstalledRef.current) {
          installVNCWebSocketProxy();
          proxyInstalledRef.current = true;
        }

        // Create the VNC proxy through the NetBird tunnel.
        const proxyURL: string = await client.client.createVNCProxy(
          config.hostname,
          String(config.port),
          config.mode || "attach",
          config.username || "",
          config.jwt || "",
          config.sessionID || 0,
        );

        // Dynamically import noVNC. The @novnc/novnc package exports
        // RFB from core/rfb.js.
        // Load noVNC from vendored ESM source (npm package is CommonJS, doesn't work in Next.js).
        const NOVNC_PKG = "/novnc-pkg/core/rfb.js";
        // @ts-ignore - Dynamic import from public directory
        const { default: RFB } = await import(/* webpackIgnore: true */ NOVNC_PKG);

        // noVNC creates its own canvas inside the container div.
        const rfb = new RFB(containerRef.current, proxyURL, {
          wsProtocols: [],
        });

        rfb.scaleViewport = config.scale ?? true;
        rfb.resizeSession = config.resize ?? false;
        rfb.clipViewport = false;
        rfb.showDotCursor = config.dotCursor ?? true;
        rfb.focusOnClick = true;
        if (config.quality !== undefined) {
          rfb.qualityLevel = config.quality;
        }

        const connectTimeout = setTimeout(() => {
          if (rfbRef.current && statusRef.current !== VNCStatus.CONNECTED) {
            setError("VNC connection timed out. The peer may be unreachable or restarting.");
            try { rfb.disconnect(); } catch {}
            rfbRef.current = null;
            updateStatus(VNCStatus.DISCONNECTED);
          }
        }, 20000);

        rfb.addEventListener("connect", () => {
          clearTimeout(connectTimeout);
          updateStatus(VNCStatus.CONNECTED);
          rfb.focus();
        });

        rfb.addEventListener("disconnect", (e: any) => {
          clearTimeout(connectTimeout);
          const detail = e.detail || {};
          if (!detail.clean) {
            setError("VNC connection lost unexpectedly");
          }
          updateStatus(VNCStatus.DISCONNECTED);
          rfbRef.current = null;
        });

        rfb.addEventListener("securityfailure", (e: any) => {
          clearTimeout(connectTimeout);
          const detail = e.detail || {};
          setError(detail.reason || "VNC connection rejected");
        });

        // Server → browser clipboard: write to browser clipboard when server sends text.
        rfb.addEventListener("clipboard", (e: any) => {
          const text = e.detail?.text;
          if (text && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
        });

        // Browser → server clipboard: send clipboard content on focus.
        const sendClipboard = () => {
          if (navigator.clipboard?.readText) {
            navigator.clipboard.readText().then((text) => {
              if (text && rfbRef.current) {
                rfbRef.current.clipboardPasteFrom(text);
              }
            }).catch(() => {});
          }
        };
        window.addEventListener("focus", sendClipboard);
        rfb.addEventListener("disconnect", () => {
          window.removeEventListener("focus", sendClipboard);
        });

        rfbRef.current = rfb;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "VNC connection failed";
        setError(errorMessage);
        updateStatus(VNCStatus.DISCONNECTED);
        throw new Error(errorMessage);
      }
    },
    [client, updateStatus],
  );

  // Handle window resize.
  useEffect(() => {
    if (!rfbRef.current || status !== VNCStatus.CONNECTED) return;

    let timeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        rfbRef.current?.scaleViewport && rfbRef.current._updateScale?.();
      }, 200);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [status]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  const sendCtrlAltDel = useCallback(() => {
    rfbRef.current?.sendCtrlAltDel();
  }, []);

  return {
    connect,
    disconnect,
    sendCtrlAltDel,
    status,
    error,
    containerRef,
  };
};
