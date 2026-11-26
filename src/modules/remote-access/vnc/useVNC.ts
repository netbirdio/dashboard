import type RFB from "@novnc/novnc";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearLastVNCCloseInfo,
  getLastVNCCloseInfo,
  installVNCWebSocketProxy,
  sendRawToVNCProxy,
} from "./websocket-proxy";

// Matches ViewOnlyDesktopNamePrefix in client/vnc/server/session.go.
// NUL framing guarantees no collision with a user-set name.
const VIEW_ONLY_PREFIX = "\x00NB-VIEW-ONLY\x00";

export enum VNCStatus {
  DISCONNECTED = 0,
  CONNECTED = 1,
  CONNECTING = 2,
}

export type VNCMode = "attach" | "session";

// VNCTarget names which server the viewer talks to. They differ in more than
// the port: "netbird" is authenticated by a session key management issued,
// asks the person at the peer for approval, can be granted view-only and
// reports who connected. "external" is a third-party VNC server on the peer,
// so none of that applies and whatever security type that server offers is
// the only thing standing in front of the screen.
export type VNCTarget = "netbird" | "external";

// Default port of the VNC servers people already run. NetBird's own server is
// reached on its own port and does not use this.
export const DEFAULT_EXTERNAL_VNC_PORT = 5900;

// Stable reject codes emitted by the NetBird VNC server (client/vnc/server).
// Must stay in sync with RejectCode* constants in client/vnc/server/server.go.
export enum VNCRejectCode {
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",
  SESSION_ERROR = "SESSION_ERROR",
  CAPTURER_ERROR = "CAPTURER_ERROR",
  UNSUPPORTED = "UNSUPPORTED",
  BAD_REQUEST = "BAD_REQUEST",
  NO_CONSOLE_USER = "NO_CONSOLE_USER",
  APPROVAL_DENIED = "APPROVAL_DENIED",
  APPROVAL_TIMEOUT = "APPROVAL_TIMEOUT",
  APPROVAL_UNAVAILABLE = "APPROVAL_UNAVAILABLE",
  NO_APPROVER = "NO_APPROVER",
}

export interface VNCError {
  code?: VNCRejectCode;
  message: string;
  // friendly is a short, user-facing string derived from the code, suitable
  // for display in a toast or inline alert without further formatting.
  friendly: string;
  // retryable marks a failure that a second attempt may simply not hit, so a
  // caller may try once more before showing it. Set for a dial that timed
  // out, which happens while an access rule is still reaching the peer.
  retryable?: boolean;
  // badPassword marks a security failure that arrived after a password was
  // supplied, so the answer rather than the connection is what was wrong.
  // The server drops the connection either way, so recovering means
  // connecting again and asking for the password once more.
  badPassword?: boolean;
}

const friendlyByCode: Record<string, string> = {
  [VNCRejectCode.AUTH_FORBIDDEN]:
    "You are not allowed to connect to this peer.",
  [VNCRejectCode.SESSION_ERROR]:
    "Could not start the virtual session on the peer.",
  [VNCRejectCode.CAPTURER_ERROR]: "The peer cannot capture its screen.",
  [VNCRejectCode.UNSUPPORTED]:
    "This action is not supported on the peer's platform.",
  [VNCRejectCode.BAD_REQUEST]:
    "The connection request was rejected by the peer.",
  [VNCRejectCode.NO_CONSOLE_USER]: "Nobody is signed in on the peer.",
  [VNCRejectCode.APPROVAL_DENIED]:
    "The peer's user declined the connection request.",
  [VNCRejectCode.APPROVAL_TIMEOUT]:
    "The peer's user did not answer the connection request in time.",
  [VNCRejectCode.APPROVAL_UNAVAILABLE]:
    "The connection request could not be shown to the peer's user. Make sure the NetBird UI is running on the peer.",
  [VNCRejectCode.NO_APPROVER]:
    "Approval prompt could not be delivered. Make sure the NetBird UI is running on the peer.",
};

/**
 * Reports whether a credentials request can be answered with a password alone,
 * which is all the viewer sends. A server that also wants a username (Apple
 * Remote Desktop, VeNCrypt Plain) would ask again after every answer, so such a
 * request has to be refused up front. A request that names no types is the
 * classic password prompt.
 */
export const asksOnlyForPassword = (types?: string[]): boolean =>
  !types || (types.length > 0 && types.every((t) => t === "password"));

// How long the viewer waits for a session before reporting a timeout. A
// NetBird peer may be waiting on its user to accept the connection, and the
// WASM proxy allows that wait up to 90s (approvalReadDeadline), so the viewer
// must not give up first. An external server has no prompt to wait for.
const CONNECT_TIMEOUT_MS = 20_000;
const NETBIRD_CONNECT_TIMEOUT_MS = 95_000;

// WebSocket close codes emitted by the WASM VNC proxy. Must stay in
// sync with wsCode* in client/wasm/internal/vnc/proxy.go.
const WS_CODE_DIAL_TIMEOUT = 4001;
const WS_CODE_DIAL_FAILURE = 4002;
const WS_CODE_SESSION_SETUP = 4003;
const WS_CODE_TRANSPORT = 4004;

// formatTransportError builds a user-facing VNCError from the WebSocket
// close code. hadConnected is a tiebreaker for unclassified codes.
//
// target changes what a dial failure is likely to mean. For NetBird's own
// server the port is opened by the agent, so a failure points at the peer
// being unreachable. For a third-party server the port is somebody else's
// responsibility, and the two dial outcomes distinguish reaching the peer
// but finding nothing there from not reaching it at all. Both are reported
// as the observation rather than a diagnosis: the causes differ per setup,
// and naming one sends people to check the wrong thing.
const formatTransportError = (
  code: number,
  reason: string,
  hadConnected: boolean,
  target: VNCTarget,
  port?: number,
): VNCError => {
  const r = reason.trim();
  const at = port ? ` on port ${port}` : "";
  switch (code) {
    case WS_CODE_DIAL_TIMEOUT:
      return {
        message: r || "dial timeout",
        retryable: true,
        friendly:
          target === "external"
            ? `The peer did not respond${at}.`
            : "Could not reach the peer. It may be offline.",
      };
    case WS_CODE_DIAL_FAILURE:
      return {
        message: r || "dial failure",
        friendly:
          target === "external"
            ? `Nothing is listening${at} on the peer.`
            : "Could not connect to the peer.",
      };
    case WS_CODE_SESSION_SETUP:
      return {
        message: r || "session setup failed",
        friendly: "The peer rejected the session request.",
      };
    case WS_CODE_TRANSPORT:
      return {
        message: r || "transport lost",
        friendly: "The peer stopped responding. Connection lost.",
      };
  }
  return {
    message: r || (hadConnected ? "connection lost" : "connect failed"),
    friendly: hadConnected
      ? "VNC connection lost unexpectedly."
      : "Could not connect to the peer.",
  };
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
  sessionID?: number;
  width?: number;
  height?: number;
  scale?: boolean;
  resize?: boolean;
  quality?: number;
  dotCursor?: boolean;
  // peerPublicKey is the destination peer's base64-encoded X25519
  // public key, used as the responder static in the Noise_IK handshake.
  peerPublicKey?: string;
  // keySessionId is the opaque handle to the wasm-resident X25519
  // session private key the dashboard registered with management.
  keySessionId?: string;
  // ipVersion forces the address family for the dial to the peer:
  // "4" or "6"; unset lets the dialer pick.
  ipVersion?: string;
  // target selects the server to talk to; defaults to "netbird". An
  // "external" connection carries plain RFB and must not be given
  // peerPublicKey or keySessionId, which only NetBird's server understands.
  target?: VNCTarget;
}

interface VNCClient {
  client?: {
    createVNCProxy: (
      hostname: string,
      port: string,
      mode: string,
      username: string,
      keySessionId: string,
      sessionID: number,
      width: number,
      height: number,
      peerPublicKey: string,
      ipVersion: number,
      external: boolean,
    ) => Promise<string>;
  };
}

export const useVNC = (client: VNCClient) => {
  const [status, setStatus] = useState(VNCStatus.DISCONNECTED);
  const statusRef = useRef(VNCStatus.DISCONNECTED);
  const [error, setError] = useState<string>("");
  const errorDetailRef = useRef<VNCError | null>(null);
  // hadConnectedRef distinguishes a transport drop during a live session
  // from a failure before the RFB handshake completed, so the disconnect
  // handler can phrase the error correctly.
  const hadConnectedRef = useRef(false);
  // The disconnect handler runs long after connect() returned, so the target
  // and port it needs to phrase a dial failure are kept rather than re-read
  // from a config the caller may already have changed.
  const targetRef = useRef<VNCTarget>("netbird");
  const portRef = useRef<number | undefined>(undefined);
  // credentialsRequired is true while a server has asked for a password and
  // none has been supplied yet. Only an external server ever asks: NetBird's
  // own authenticates before RFB begins.
  const [credentialsRequired, setCredentialsRequired] = useState(false);
  // passwordSentRef records that this connection answered a credentials
  // request, so a security failure afterwards can be attributed to the
  // password. Cleared per connect, not per request.
  const passwordSentRef = useRef(false);
  // restartConnectTimeoutRef restarts the connect deadline of the current
  // connection after it was paused for the credentials prompt.
  const restartConnectTimeoutRef = useRef<(() => void) | null>(null);

  // errorDetail mirrors errorDetailRef for consumers. The ref stays because
  // the disconnect handler reads it synchronously to decide whether a more
  // specific error was already reported.
  const [errorDetail, setErrorDetail] = useState<VNCError | null>(null);

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
  const rfbRef = useRef<RFB | null>(null);
  const proxyInstalledRef = useRef(false);
  const proxyIDRef = useRef<string>("");

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
    proxyIDRef.current = "";
    setCredentialsRequired(false);
    updateStatus(VNCStatus.DISCONNECTED);
  }, [updateStatus]);

  const connect = useCallback(
    async (config: VNCConfig) => {
      // Also refuse while connected: a second session would replace
      // rfbRef.current and leak the live one, whose listeners still fire.
      if (
        statusRef.current === VNCStatus.CONNECTING ||
        statusRef.current === VNCStatus.CONNECTED
      ) {
        return;
      }

      const isExternal = config.target === "external";
      hadConnectedRef.current = false;
      targetRef.current = config.target ?? "netbird";
      portRef.current = config.port;
      setCredentialsRequired(false);
      passwordSentRef.current = false;
      updateStatus(VNCStatus.CONNECTING);
      clearError();

      try {
        if (!containerRef.current) {
          throw new Error("VNC container not available");
        }

        if (!client?.client?.createVNCProxy) {
          throw new Error(
            "NetBird client is not ready yet, please reload the page",
          );
        }

        // Install WebSocket proxy if not already done.
        if (!proxyInstalledRef.current) {
          installVNCWebSocketProxy();
          proxyInstalledRef.current = true;
        }

        // Create the VNC proxy through the NetBird tunnel. proxyURL is
        // wss://vnc.proxy.local/<proxyID>; capture the ID so the toolbar
        // can send NetBird-specific RFB messages out-of-band.
        const proxyURL: string = await client.client.createVNCProxy(
          config.hostname,
          String(config.port),
          config.mode || "attach",
          config.username || "",
          config.keySessionId || "",
          config.sessionID || 0,
          config.width || 0,
          config.height || 0,
          config.peerPublicKey || "",
          Number(config.ipVersion) || 0,
          isExternal,
        );

        const proxyIDMatch = proxyURL.match(/vnc\.proxy\.local\/(.+)/);
        const proxyID = proxyIDMatch?.[1] || "default";

        const { default: RFB } = await import("@novnc/novnc");

        // noVNC creates its own canvas inside the container div.
        const rfb = new RFB(containerRef.current, proxyURL, {
          wsProtocols: [],
        });

        rfb.scaleViewport = config.scale ?? true;
        rfb.resizeSession = config.resize ?? false;
        rfb.clipViewport = false;
        // Disable noVNC's dot fallback so the only inline cursor values we
        // ever see are `none` (nothing from the server) or `url(...)` (a
        // real Cursor pseudo-encoded sprite).
        rfb.showDotCursor = config.dotCursor ?? false;
        rfb.focusOnClick = true;
        if (config.quality !== undefined) {
          rfb.qualityLevel = config.quality;
        }

        const onConnectTimeout = () => {
          if (
            rfbRef.current === rfb &&
            statusRef.current !== VNCStatus.CONNECTED
          ) {
            reportError({
              message: "VNC connection timed out",
              friendly:
                "VNC connection timed out. The peer may be unreachable or restarting.",
            });
            try {
              rfb.disconnect();
            } catch {}
            rfbRef.current = null;
            updateStatus(VNCStatus.DISCONNECTED);
          }
        };
        const connectTimeoutMs = isExternal
          ? CONNECT_TIMEOUT_MS
          : NETBIRD_CONNECT_TIMEOUT_MS;
        let connectTimeout = setTimeout(onConnectTimeout, connectTimeoutMs);
        // The timeout is paused while the operator types a password, so
        // answering has to start it again: a server that takes the password
        // and then goes quiet would otherwise leave the viewer connecting.
        restartConnectTimeoutRef.current = () => {
          clearTimeout(connectTimeout);
          connectTimeout = setTimeout(onConnectTimeout, connectTimeoutMs);
        };

        rfb.addEventListener("connect", () => {
          clearTimeout(connectTimeout);
          hadConnectedRef.current = true;
          updateStatus(VNCStatus.CONNECTED);
          rfb.focus();
        });

        rfb.addEventListener("disconnect", (e: Event) => {
          clearTimeout(connectTimeout);
          // noVNC reports the end of a session some time after End session,
          // by which point Reconnect may have started the next one. Only the
          // session that still owns rfbRef (or none, after End session) may
          // reset the shared state.
          if (rfbRef.current !== null && rfbRef.current !== rfb) {
            clearLastVNCCloseInfo(proxyID);
            return;
          }
          const detail = (e as CustomEvent<{ clean?: boolean }>).detail || {};
          // securityfailure fires before disconnect and has already set the
          // specific reason; don't overwrite it with a generic message.
          if (!detail.clean && !errorDetailRef.current) {
            const closeInfo = getLastVNCCloseInfo(proxyID);
            reportError(
              formatTransportError(
                closeInfo?.code ?? 0,
                closeInfo?.reason ?? "",
                hadConnectedRef.current,
                targetRef.current,
                portRef.current,
              ),
            );
          }
          clearLastVNCCloseInfo(proxyID);
          setCredentialsRequired(false);
          setViewOnly(false);
          // The server starts every session with the remote cursor off, so the
          // toolbar must not carry the previous session's state into the next.
          setShowRemoteCursorState(false);
          updateStatus(VNCStatus.DISCONNECTED);
          rfbRef.current = null;
        });

        rfb.addEventListener("securityfailure", (e: Event) => {
          clearTimeout(connectTimeout);
          const detail = (e as CustomEvent<{ reason?: string }>).detail || {};
          setCredentialsRequired(false);
          // Attributed to the password rather than matched on the server's
          // wording: a failure that arrives once one was sent is a failure to
          // accept it, whatever the server chose to call it.
          const rejection = parseVNCRejection(detail.reason ?? "");
          if (passwordSentRef.current) {
            rejection.badPassword = true;
          }
          reportError(rejection);
        });

        // Only a third-party server reaches this: NetBird's own advertises
        // no password security type. noVNC keeps the connection open until
        // sendCredentials answers, so the timeout above is cleared to stop it
        // tearing down a session that is merely waiting on the operator.
        rfb.addEventListener("credentialsrequired", (e: Event) => {
          clearTimeout(connectTimeout);
          const types = (e as CustomEvent<{ types?: string[] }>).detail?.types;
          if (!asksOnlyForPassword(types)) {
            reportError({
              message: `unsupported credentials: ${(types ?? []).join(", ")}`,
              friendly: `This VNC server asked for credentials the viewer cannot supply (${(types ?? []).join(", ")}).`,
            });
            try {
              rfb.disconnect();
            } catch {}
            return;
          }
          setCredentialsRequired(true);
        });

        // The server tags the desktop name with VIEW_ONLY_PREFIX when
        // the host approved the connection read-only. Mirror it into
        // rfb.viewOnly + React state so the toolbar updates.
        rfb.addEventListener("desktopname", (e: Event) => {
          const detail = (e as CustomEvent<{ name?: string }>).detail || {};
          const name = detail.name ?? "";
          if (name.startsWith(VIEW_ONLY_PREFIX)) {
            rfb.viewOnly = true;
            setViewOnly(true);
            setShowRemoteCursorState(true);
          }
        });

        // Server → browser clipboard: write to browser clipboard when server sends text.
        rfb.addEventListener("clipboard", (e: Event) => {
          const text = (e as CustomEvent<{ text?: string }>).detail?.text;
          if (text && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
        });

        // Browser → server clipboard: keep host clipboard in sync with
        // the remote OS clipboard on every window focus. The server side
        // only writes to the OS clipboard (no auto-typing), so this is
        // safe and lets Ctrl+V work normally on a logged-in desktop. The
        // Paste toolbar button is the only path that synthesizes
        // keystrokes (for Winlogon/UAC).
        const sendClipboard = () => {
          if (navigator.clipboard?.readText) {
            navigator.clipboard
              .readText()
              .then((text) => {
                if (text && rfbRef.current) {
                  rfbRef.current.clipboardPasteFrom(text);
                }
              })
              .catch((err) => {
                // Denied or unsupported: the paste button and Ctrl+V still
                // work, so this is not fatal, but silence made it undebuggable.
                console.debug("clipboard sync on focus skipped:", err);
              });
          }
        };
        window.addEventListener("focus", sendClipboard);
        rfb.addEventListener("disconnect", () => {
          window.removeEventListener("focus", sendClipboard);
        });

        rfbRef.current = rfb;
        proxyIDRef.current = proxyID;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "VNC connection failed";
        reportError({ message: errorMessage, friendly: errorMessage });
        updateStatus(VNCStatus.DISCONNECTED);
        throw new Error(errorMessage);
      }
    },
    [client, updateStatus, clearError, reportError],
  );

  // Handle window resize.
  useEffect(() => {
    if (!rfbRef.current || status !== VNCStatus.CONNECTED) return;

    let timeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Re-assigning scaleViewport runs noVNC's setter, which recomputes
        // the scale. _updateScale is private and would break on a bump.
        const rfb = rfbRef.current;
        if (rfb?.scaleViewport) {
          rfb.scaleViewport = true;
        }
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

  // Synchronous tab/window close handler. React unmount doesn't run before
  // the page is torn down on close, so without this the browser may keep
  // the WebSocket alive in bfcache and the daemon-side proxy goroutine
  // stays blocked on its read until a much later TCP keepalive times out.
  // pagehide fires reliably on real navigations away (close, reload, link)
  // even when the page is being moved to bfcache (persisted=true), and
  // calling rfb.disconnect() here flushes the WS close frame before the
  // page is suspended.
  useEffect(() => {
    if (status !== VNCStatus.CONNECTED && status !== VNCStatus.CONNECTING) {
      return;
    }
    const handler = () => {
      try {
        rfbRef.current?.disconnect();
      } catch {}
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [status]);

  const sendCtrlAltDel = useCallback(() => {
    rfbRef.current?.sendCtrlAltDel();
    rfbRef.current?.focus();
  }, []);

  // typeTextOnRemote asks the server to type text as keystrokes with the
  // NetBird-specific RFB message (clientNetbirdTypeText = 250), which is how
  // paste reaches a secure desktop where the clipboard is isolated. Wire
  // format: 1-byte msgType + 3-byte padding + 4-byte length + UTF-8 bytes.
  const typeTextOnRemote = useCallback((text: string): boolean => {
    if (!rfbRef.current || !text) return false;
    // A third-party server has no idea what message 250 is, and an unknown
    // client message type desynchronizes the RFB stream rather than being
    // skipped. Standard CutText is all it can be offered.
    if (targetRef.current === "external") {
      rfbRef.current.clipboardPasteFrom(text);
      rfbRef.current.focus();
      return false;
    }
    const utf8 = new TextEncoder().encode(text);
    const buf = new Uint8Array(8 + utf8.length);
    buf[0] = 250;
    const view = new DataView(buf.buffer);
    view.setUint32(4, utf8.length, false);
    buf.set(utf8, 8);
    const sent = sendRawToVNCProxy(proxyIDRef.current, buf);
    if (!sent) {
      // Fall back to standard CutText so we at least update the OS clipboard
      // when the type path isn't available. Nothing is typed, so report that:
      // callers must not tell the user their paste reached the remote.
      rfbRef.current.clipboardPasteFrom(text);
    }
    rfbRef.current.focus();
    return sent;
  }, []);

  const pasteFromHostClipboard = useCallback(async (): Promise<boolean> => {
    if (!rfbRef.current || !navigator.clipboard?.readText) return false;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return false;
      return typeTextOnRemote(text);
    } catch {
      // Denied or unsupported: the paste gesture path is the way in.
      return false;
    }
  }, [typeTextOnRemote]);

  const focus = useCallback(() => {
    rfbRef.current?.focus();
  }, []);

  const [viewOnly, setViewOnly] = useState(false);

  // handlePasteShortcut takes Ctrl/Cmd+V before noVNC's keydown handler, which
  // calls preventDefault on everything it handles (stopEvent in
  // core/input/keyboard.js) and would otherwise swallow the shortcut. Reading the
  // clipboard here rather than relying on the native paste event is what makes it
  // work in Firefox, which withholds paste events from non-editable targets
  // (https://bugzilla.mozilla.org/show_bug.cgi?id=846674) but does treat a
  // keydown as the user activation readText requires. Firefox asks once per
  // session and remembers the grant.
  //
  // Propagation stops so the remote does not also receive Ctrl+V and paste its
  // own clipboard on top of what we type.
  //
  // Left alone entirely for an external server: typing the text needs a message
  // only NetBird's server understands, so intercepting would swallow the
  // keystroke and paste nothing. Forwarded instead, and the remote pastes its
  // own clipboard, which the focus handler above keeps in step with the host's.
  const handlePasteShortcut = useCallback(
    (e: ReactKeyboardEvent): void => {
      if (viewOnly || targetRef.current === "external") return;
      const isPaste =
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        !e.shiftKey &&
        e.key.toLowerCase() === "v";
      if (!isPaste) return;
      e.stopPropagation();
      e.preventDefault();
      void pasteFromHostClipboard();
    },
    [viewOnly, pasteFromHostClipboard],
  );

  const [showRemoteCursor, setShowRemoteCursorState] = useState(false);
  const setShowRemoteCursor = useCallback((enable: boolean) => {
    // Same reasoning as typeTextOnRemote: message 251 is ours, so it is never
    // put on the wire to a server that would misread it.
    if (targetRef.current === "external") return false;
    // Wire format mirrors the server side (clientNetbirdShowRemoteCursor =
    // 251): 1-byte msg + 1-byte flag + 6 bytes padding so the message is
    // a fixed 8 bytes.
    const buf = new Uint8Array(8);
    buf[0] = 251;
    buf[1] = enable ? 1 : 0;
    const sent = sendRawToVNCProxy(proxyIDRef.current, buf);
    if (sent) {
      setShowRemoteCursorState(enable);
    }
    return sent;
  }, []);

  // sendPassword answers a pending credentials request. Reports false when no
  // request is outstanding, so a caller cannot mistake a discarded password
  // for one the server received.
  const sendPassword = useCallback((password: string): boolean => {
    if (!rfbRef.current || !credentialsRequired) return false;
    setCredentialsRequired(false);
    passwordSentRef.current = true;
    rfbRef.current.sendCredentials({ password });
    restartConnectTimeoutRef.current?.();
    return true;
  }, [credentialsRequired]);

  return {
    connect,
    disconnect,
    sendCtrlAltDel,
    pasteFromHostClipboard,
    handlePasteShortcut,
    focus,
    showRemoteCursor,
    setShowRemoteCursor,
    viewOnly,
    credentialsRequired,
    sendPassword,
    status,
    error,
    errorDetail,
    containerRef,
  };
};
