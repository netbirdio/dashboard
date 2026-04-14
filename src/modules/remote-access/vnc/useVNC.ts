import { useCallback, useEffect, useRef, useState } from "react";
import { installVNCWebSocketProxy } from "./websocket-proxy";

export enum VNCStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
  CONNECTING = 2,
}

export type VNCMode = "attach" | "session";

// Stable reject codes emitted by the NetBird VNC server (client/vnc/server).
// Must stay in sync with RejectCode* constants in client/vnc/server/server.go.
export enum VNCRejectCode {
  JWT_MISSING = "AUTH_JWT_MISSING",
  JWT_EXPIRED = "AUTH_JWT_EXPIRED",
  JWT_INVALID = "AUTH_JWT_INVALID",
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",
  AUTH_CONFIG = "AUTH_CONFIG",
  SESSION_ERROR = "SESSION_ERROR",
  CAPTURER_ERROR = "CAPTURER_ERROR",
  UNSUPPORTED = "UNSUPPORTED",
  BAD_REQUEST = "BAD_REQUEST",
}

export interface VNCError {
  code?: VNCRejectCode;
  message: string;
  // friendly is a short, user-facing string derived from the code, suitable
  // for display in a toast or inline alert without further formatting.
  friendly: string;
}

const friendlyByCode: Record<string, string> = {
  [VNCRejectCode.JWT_MISSING]: "Sign-in required to connect.",
  [VNCRejectCode.JWT_EXPIRED]: "Your session has expired. Please sign in again.",
  [VNCRejectCode.JWT_INVALID]: "Authentication failed. Please sign in again.",
  [VNCRejectCode.AUTH_FORBIDDEN]: "You are not allowed to connect to this peer.",
  [VNCRejectCode.AUTH_CONFIG]: "Remote access is not configured correctly on the peer.",
  [VNCRejectCode.SESSION_ERROR]: "Could not start the virtual session on the peer.",
  [VNCRejectCode.CAPTURER_ERROR]: "The peer cannot capture its screen. Check Screen Recording permission on macOS or the display on Linux.",
  [VNCRejectCode.UNSUPPORTED]: "This action is not supported on the peer's platform.",
  [VNCRejectCode.BAD_REQUEST]: "The connection request was rejected by the peer.",
};

// parseVNCRejection splits a security-failure reason sent by the NetBird VNC
// server into its machine code and free-text message. Also works on plain
// messages from other VNC servers (returns them unchanged with friendly=msg).
export const parseVNCRejection = (reason: string): VNCError => {
  const raw = (reason || "VNC connection rejected").trim();
  const sep = raw.indexOf(": ");
  if (sep > 0) {
    const prefix = raw.slice(0, sep);
    const message = raw.slice(sep + 2);
    if ((Object.values(VNCRejectCode) as string[]).includes(prefix)) {
      const code = prefix as VNCRejectCode;
      return { code, message, friendly: friendlyByCode[code] || message };
    }
  }
  return { message: raw, friendly: raw };
};

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
  const [error, setError] = useState<string>("");
  const [errorDetail, setErrorDetail] = useState<VNCError | null>(null);
  const errorDetailRef = useRef<VNCError | null>(null);

  const reportError = useCallback((err: VNCError) => {
    errorDetailRef.current = err;
    setErrorDetail(err);
    setError(err.friendly);
  }, []);

  const clearError = useCallback(() => {
    errorDetailRef.current = null;
    setErrorDetail(null);
    setError("");
  }, []);
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
      clearError();

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
            reportError({
              message: "VNC connection timed out",
              friendly: "VNC connection timed out. The peer may be unreachable or restarting.",
            });
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
          // securityfailure fires before disconnect and has already set the
          // specific reason; don't overwrite it with a generic message.
          if (!detail.clean && !errorDetailRef.current) {
            reportError({
              message: "VNC connection lost unexpectedly",
              friendly: "VNC connection lost unexpectedly",
            });
          }
          updateStatus(VNCStatus.DISCONNECTED);
          rfbRef.current = null;
        });

        rfb.addEventListener("securityfailure", (e: any) => {
          clearTimeout(connectTimeout);
          const detail = e.detail || {};
          reportError(parseVNCRejection(detail.reason));
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
        reportError({ message: errorMessage, friendly: errorMessage });
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
    errorDetail,
    containerRef,
  };
};
