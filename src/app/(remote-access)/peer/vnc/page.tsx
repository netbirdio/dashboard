"use client";

import Button from "@components/Button";
import { notify } from "@components/Notification";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { IconCircleX } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { MonitorIcon, UserIcon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Peer } from "@/interfaces/Peer";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import {
  VNCStatus,
  useVNC,
  type VNCMode,
} from "@/modules/remote-access/vnc/useVNC";
import {
  NetBirdStatus,
  useNetBirdClient,
} from "@/modules/remote-access/useNetBirdClient";
import { useVNCQueryParams, type VNCSettings } from "@/modules/remote-access/vnc/useVNCQueryParams";
import VNCToolbar from "@/modules/remote-access/vnc/VNCToolbar";

// Network range exposed by the NetBird agent for the embedded VNC server.
// Must match the listener registered in client/vnc/server on the peer side.
const VNC_NETWORK_RANGE = "netbird-vnc/25900";

export default function VNCPage() {
  const { peerId, mode: initialMode, username: initialUser, ipVersion, settings, ready } = useVNCQueryParams();

  const {
    data: peer,
    isLoading: isPeerLoading,
  } = useFetchApi<Peer>(`/peers/${peerId}`, true, false, !!peerId);

  return (
    <div className="w-screen h-screen overflow-hidden fixed inset-0">
      {peerId && peer && !isPeerLoading ? (
        <VNCSession
          key={peer.id}
          peer={peer}
          initialMode={initialMode}
          initialUsername={initialUser}
          ipVersion={ipVersion}
          settings={settings}
        />
      ) : ready && !peerId ? (
        <MissingPeerError />
      ) : (
        <FullScreenLoading />
      )}
    </div>
  );
}

function MissingPeerError() {
  return (
    <div className="w-full h-full flex items-center justify-center flex-col text-center gap-3 bg-nb-gray-950 p-6">
      <div className="text-nb-gray-200 text-base">No peer selected.</div>
      <div className="text-sm text-nb-gray-400">
        Open the VNC viewer from a peer in the dashboard, or close this window.
      </div>
    </div>
  );
}

type Props = {
  peer: Peer;
  initialMode: VNCMode;
  initialUsername: string;
  ipVersion: string | null;
  settings: VNCSettings;
};

function VNCSession({
  peer,
  initialMode,
  initialUsername,
  ipVersion,
  settings,
}: Props) {
  const client = useNetBirdClient();
  const vnc = useVNC(client);
  const [isNetBirdConnecting, setIsNetBirdConnecting] = useState(false);
  const connected = useRef(false);
  const connectedOnce = useRef(false);
  // connectFailed latches a connect error so the effect doesn't retry in a
  // tight loop (state change re-runs the effect, which would re-popup the
  // notification). User must reload / change mode to clear it.
  const [connectFailed, setConnectFailed] = useState(false);
  // targetPubKey is the destination daemon's identity public key,
  // captured from the temporary-access response so the wasm proxy can
  // verify the X25519 challenge.
  const [targetPubKey, setTargetPubKey] = useState<string>("");
  // keySessionId is the opaque handle to the wasm-resident X25519
  // session key minted alongside the temporary-access call.
  const [keySessionId, setKeySessionId] = useState<string>("");

  const peerOSType = getOperatingSystem(peer?.os);
  const supportsSessionMode = peerOSType === OperatingSystem.LINUX || peerOSType === OperatingSystem.FREEBSD;
  const [mode, setMode] = useState<VNCMode>(supportsSessionMode ? initialMode : "attach");
  const [username, setUsername] = useState(initialUsername);
  // ipVer forces the address family for the dial: "4", "6", or "" for
  // automatic. Seeded from the ip_version query param, adjustable in the
  // setup screen.
  const [ipVer, setIpVer] = useState(
    ipVersion === "4" || ipVersion === "6" ? ipVersion : "",
  );
  // Show setup modal only if the peer supports session mode (Linux/FreeBSD).
  // macOS and Windows only support attach mode, so skip the modal.
  const [showSetup, setShowSetup] = useState(supportsSessionMode);

  useEffect(() => {
    document.title = `${peer.name} - ${peer.ip} - VNC`;
  }, [peer.ip, peer.name]);

  const sendErrorNotification = useCallback((title: string, message: string) => {
    notify({
      title,
      description: message,
      icon: <IconCircleX size={24} />,
      backgroundColor: "bg-red-500",
      duration: 10000,
    });
  }, []);

  const connectNetBird = useCallback(async () => {
    if (!peer?.id || client.status !== NetBirdStatus.DISCONNECTED) return;

    try {
      setIsNetBirdConnecting(true);
      const result = await client.connectTemporary(peer.id!, [
        VNC_NETWORK_RANGE,
      ]);
      // Only stash a non-null key: the early-exit path of connectTemporary
      // returns null, and overwriting an earlier good value with null would
      // break the X25519 identity check on the next VNC connect.
      if (result.targetPubKey) {
        setTargetPubKey(result.targetPubKey);
      }
      if (result.keySessionId) {
        setKeySessionId(result.keySessionId);
      }
    } catch (error) {
      // Latch the failure so the auto-connect effect doesn't re-fire the
      // moment connectTemporary resets the status to DISCONNECTED, which
      // would spam the toast in a tight loop. User clears it via Reconnect.
      setConnectFailed(true);
      sendErrorNotification(
        "NetBird Connection Error",
        (error as Error).message,
      );
    } finally {
      setIsNetBirdConnecting(false);
    }
  }, [peer?.id, client, sendErrorNotification]);

  useEffect(() => {
    if (
      client.status === NetBirdStatus.DISCONNECTED &&
      !isNetBirdConnecting &&
      !connected.current &&
      !connectFailed
    ) {
      connectNetBird().catch(console.error);
    }
  }, [client.status, connectNetBird, isNetBirdConnecting, connectFailed]);

  // Start VNC session when NetBird is connected (auto-connect unless setup is shown).
  useEffect(() => {
    if (
      client.status === NetBirdStatus.CONNECTED &&
      vnc.status === VNCStatus.DISCONNECTED &&
      !connected.current &&
      !isNetBirdConnecting &&
      !showSetup &&
      !connectFailed &&
      targetPubKey &&
      keySessionId
    ) {
      connected.current = true;
      vnc
        .connect({
          hostname: peer.dns_label || peer.ip,
          port: 5900,
          mode,
          ipVersion: ipVer || undefined,
          username: mode === "session" ? username : undefined,
          width: mode === "session" ? window.innerWidth : undefined,
          height: mode === "session" ? window.innerHeight : undefined,
          scale: settings.scale,
          resize: settings.resize,
          quality: settings.quality,
          dotCursor: settings.dotCursor,
          peerPublicKey: targetPubKey,
          keySessionId: keySessionId,
        })
        .catch(() => {
          // useVNC reports the error via vnc.error; the effect below shows
          // the inline panel. Just clear our retry guard and latch the
          // failure.
          connected.current = false;
          setConnectFailed(true);
        });
    }
  }, [
    client.status,
    vnc.connect,
    vnc.status,
    peer.dns_label,
    peer.ip,
    ipVer,
    isNetBirdConnecting,
    showSetup,
    mode,
    username,
    settings,
    connectFailed,
    targetPubKey,
    keySessionId,
  ]);

  // Track when VNC first connects, and grab keyboard focus once the
  // canvas container has been re-rendered as visible (the connect event
  // from noVNC fires while we're still in the "hidden" branch, so the
  // focus call would otherwise be a no-op).
  useEffect(() => {
    if (vnc.status === VNCStatus.CONNECTED) {
      connectedOnce.current = true;
      const t = setTimeout(() => vnc.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [vnc.status, vnc.focus]);

  useEffect(() => {
    if (vnc.error) {
      // The inline panel on the setup / disconnect screen carries the
      // message permanently, so we don't fire a toast on top of it.
      // Stop the auto-connect effect from looping and surface the
      // Reconnect path. Session-mode peers also bounce back to setup so
      // the user can adjust username / mode. connectedOnce is only true
      // if we got at least one frame.
      if (!connectedOnce.current) {
        connected.current = false;
        setConnectFailed(true);
        if (supportsSessionMode) {
          setShowSetup(true);
        }
      }
    }
    if (client.error) {
      sendErrorNotification("NetBird Client Error", client.error);
    }
  }, [vnc.error, client.error, supportsSessionMode, sendErrorNotification]);

  const handleStartSession = () => {
    if (mode === "session" && !(username || "").trim()) return;
    setShowSetup(false);
    setConnectFailed(false);
  };

  const handleReconnect = async () => {
    connected.current = false;
    connectedOnce.current = false;
    setConnectFailed(false);
    vnc.disconnect();
    try {
      setIsNetBirdConnecting(true);
      const result = await client.connectTemporary(peer.id!, [
        VNC_NETWORK_RANGE,
      ]);
      // connectTemporary short-circuits with null fields when the
      // NetBird overlay is already connected, in which case the keys
      // captured on the first attempt stay valid. Only overwrite when
      // the call actually re-issued them.
      if (result.targetPubKey) {
        setTargetPubKey(result.targetPubKey);
      }
      if (result.keySessionId) {
        setKeySessionId(result.keySessionId);
      }
    } catch (error) {
      sendErrorNotification("NetBird Connection Error", (error as Error).message);
    } finally {
      setIsNetBirdConnecting(false);
    }
  };

  const isLoading =
    client.status === NetBirdStatus.CONNECTING ||
    vnc.status === VNCStatus.CONNECTING ||
    isNetBirdConnecting;

  // vncWaitElapsed swaps the "Connecting to VNC" label for a hint that
  // approval may be pending once the wait has run long enough that the
  // host prompt is the most likely thing we're blocked on. The peer may
  // have approval disabled, so the phrasing stays tentative.
  const [vncWaitElapsed, setVncWaitElapsed] = useState(false);
  useEffect(() => {
    if (vnc.status !== VNCStatus.CONNECTING) {
      setVncWaitElapsed(false);
      return;
    }
    const t = setTimeout(() => setVncWaitElapsed(true), 2500);
    return () => clearTimeout(t);
  }, [vnc.status]);

  const loadingLabel = (() => {
    if (isNetBirdConnecting) return "Requesting temporary peer access…";
    if (client.status === NetBirdStatus.CONNECTING) return "Bringing up NetBird overlay…";
    if (vnc.status === VNCStatus.CONNECTING) {
      return vncWaitElapsed
        ? "Connecting to VNC server… the peer may be prompting its user for approval."
        : "Connecting to VNC server…";
    }
    return undefined;
  })();

  // Setup screen for session mode when username is needed.
  if (showSetup && !isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-nb-gray-950">
        <div className="w-full max-w-sm p-6 space-y-4">
          <h2 className="text-lg font-medium text-white">
            VNC Session: {peer.name}
          </h2>
          <p className="text-sm text-nb-gray-400">
            Choose how to connect to this peer.
          </p>

          {vnc.error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {vnc.error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setMode("attach")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                mode === "attach"
                  ? "bg-nb-gray-800 border-nb-gray-600 text-white"
                  : "bg-nb-gray-900 border-nb-gray-800 text-nb-gray-400 hover:border-nb-gray-700"
              }`}
            >
              <MonitorIcon size={16} />
              Current Session
            </button>
            <button
              onClick={() => setMode("session")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                mode === "session"
                  ? "bg-nb-gray-800 border-nb-gray-600 text-white"
                  : "bg-nb-gray-900 border-nb-gray-800 text-nb-gray-400 hover:border-nb-gray-700"
              }`}
            >
              <UserIcon size={16} />
              User Session
            </button>
          </div>

          {mode === "session" && (
            <div>
              <label className="block text-sm text-nb-gray-400 mb-1">
                Login as user
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. root, alice"
                className="w-full px-3 py-2 bg-nb-gray-900 border border-nb-gray-700 rounded-md text-white text-sm placeholder:text-nb-gray-600 focus:outline-none focus:border-nb-gray-500"
                onKeyDown={(e) => e.key === "Enter" && handleStartSession()}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-nb-gray-400 mb-1">
              IP version
            </label>
            <select
              value={ipVer}
              onChange={(e) => setIpVer(e.target.value)}
              className="w-full px-3 py-2 bg-nb-gray-900 border border-nb-gray-700 rounded-md text-white text-sm focus:outline-none focus:border-nb-gray-500"
            >
              <option value="">Automatic</option>
              <option value="4">IPv4</option>
              <option value="6" disabled={!peer.ipv6}>
                IPv6
              </option>
            </select>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleStartSession}
            disabled={mode === "session" && !(username || "").trim()}
          >
            Connect
          </Button>
        </div>
      </div>
    );
  }

  // Show disconnected screen with reconnect when a session ended or
  // the initial connect attempt failed (attach-mode peers; session mode
  // gets bounced back to the setup form by the failure-bouncing effect
  // above).
  if (
    vnc.status === VNCStatus.DISCONNECTED &&
    (connectedOnce.current || connectFailed) &&
    !isLoading
  ) {
    return (
      <div className="w-full h-full flex items-center justify-center flex-col text-center gap-4 bg-nb-gray-950">
        <div className="text-nb-gray-200 font-normal text-base flex gap-2 items-center justify-center">
          Disconnected from {peer.name}
          <button
            className="underline-offset-4 items-center transition-all duration-200 inline-flex gap-1 text-netbird hover:underline font-normal"
            onClick={handleReconnect}
          >
            Reconnect
          </button>
        </div>
        {vnc.error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 max-w-md">
            {vnc.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {isLoading && <FullScreenLoading label={loadingLabel} />}

      {vnc.status === VNCStatus.CONNECTED && (
        <VNCToolbar
          onCtrlAltDel={peerOSType === OperatingSystem.WINDOWS ? vnc.sendCtrlAltDel : undefined}
          onPaste={vnc.viewOnly ? undefined : vnc.pasteFromHostClipboard}
          showRemoteCursor={vnc.showRemoteCursor}
          onToggleRemoteCursor={
            vnc.viewOnly || peerOSType === OperatingSystem.APPLE
              ? undefined
              : vnc.setShowRemoteCursor
          }
          viewOnly={vnc.viewOnly}
        />
      )}

      <div
        ref={vnc.containerRef}
        tabIndex={-1}
        onContextMenu={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        className={
          vnc.status === VNCStatus.CONNECTED
            ? "w-full h-full bg-black vnc-cursor outline-none" +
              // In view-only mode the host cursor is baked into the
              // framebuffer but the viewer still needs to see their own
              // pointer for orientation, so we keep the local cursor
              // visible. In control mode we hide it to avoid two cursors
              // tracking together.
              (vnc.showRemoteCursor && !vnc.viewOnly ? " vnc-cursor-remote" : "")
            : "hidden"
        }
      />
    </>
  );
}
