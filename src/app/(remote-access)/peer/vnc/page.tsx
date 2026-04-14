"use client";

import Button from "@components/Button";
import { notify } from "@components/Notification";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { useOidcAccessToken } from "@axa-fr/react-oidc";
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

export default function VNCPage() {
  const { peerId, mode: initialMode, username: initialUser, settings } = useVNCQueryParams();

  const {
    data: peer,
    isLoading,
  } = useFetchApi<Peer>(`/peers/${peerId}`, true, false, !!peerId);

  return (
    <div className="w-screen h-screen overflow-hidden fixed inset-0">
      {peerId && peer && !isLoading ? (
        <VNCSession
          key={peer.id}
          peer={peer}
          initialMode={initialMode}
          initialUsername={initialUser}
          settings={settings}
        />
      ) : (
        <FullScreenLoading />
      )}
    </div>
  );
}

type Props = {
  peer: Peer;
  initialMode: VNCMode;
  initialUsername: string;
  settings: VNCSettings;
};

function VNCSession({ peer, initialMode, initialUsername, settings }: Props) {
  const client = useNetBirdClient();
  const vnc = useVNC(client);
  const { accessToken } = useOidcAccessToken();
  const [isNetBirdConnecting, setIsNetBirdConnecting] = useState(false);
  const connected = useRef(false);
  const connectedOnce = useRef(false);

  const peerOSType = getOperatingSystem(peer?.os);
  const supportsSessionMode = peerOSType === OperatingSystem.LINUX || peerOSType === OperatingSystem.FREEBSD;
  const [mode, setMode] = useState<VNCMode>(supportsSessionMode ? initialMode : "attach");
  const [username, setUsername] = useState(initialUsername);
  // Show setup modal only if the peer supports session mode (Linux/FreeBSD).
  // macOS and Windows only support attach mode, so skip the modal.
  const [showSetup, setShowSetup] = useState(supportsSessionMode);

  useEffect(() => {
    document.title = `${peer.name} - ${peer.ip} - VNC`;
  }, [peer.ip, peer.name]);

  const sendErrorNotification = (title: string, message: string) => {
    notify({
      title,
      description: message,
      icon: <IconCircleX size={24} />,
      backgroundColor: "bg-red-500",
      duration: 10000,
    });
  };

  const connectNetBird = useCallback(async () => {
    if (!peer?.id || client.status !== NetBirdStatus.DISCONNECTED) return;

    try {
      setIsNetBirdConnecting(true);
      await client.connectTemporary(peer.id!, ["netbird-vnc/25900"]);
    } catch (error) {
      sendErrorNotification(
        "NetBird Connection Error",
        (error as Error).message,
      );
    } finally {
      setIsNetBirdConnecting(false);
    }
  }, [peer?.id, client]);

  useEffect(() => {
    if (client.status === NetBirdStatus.DISCONNECTED && !isNetBirdConnecting && !connected.current) {
      connectNetBird().catch(console.error);
    }
  }, [client.status, connectNetBird, isNetBirdConnecting]);

  // Start VNC session when NetBird is connected (auto-connect unless setup is shown).
  useEffect(() => {
    if (
      client.status === NetBirdStatus.CONNECTED &&
      vnc.status === VNCStatus.DISCONNECTED &&
      !connected.current &&
      !isNetBirdConnecting &&
      !showSetup
    ) {
      connected.current = true;
      vnc
        .connect({
          hostname: peer.ip,
          port: 5900,
          mode,
          username: mode === "session" ? username : undefined,
          jwt: peer.local_flags?.disable_vnc_auth ? undefined : (accessToken || undefined),
          scale: settings.scale,
          resize: settings.resize,
          quality: settings.quality,
          dotCursor: settings.dotCursor,
        })
        .catch((error: Error) => {
          sendErrorNotification("VNC Connection Error", error.message);
          connected.current = false;
        });
    }
  }, [client.status, vnc, peer.ip, isNetBirdConnecting, showSetup, mode, username]);

  // Track when VNC first connects.
  useEffect(() => {
    if (vnc.status === VNCStatus.CONNECTED) {
      connectedOnce.current = true;
    }
  }, [vnc.status]);

  useEffect(() => {
    if (vnc.error) {
      sendErrorNotification("VNC Error", vnc.error);
    }
    if (client.error) {
      sendErrorNotification("NetBird Client Error", client.error);
    }
  }, [vnc.error, client.error]);

  const handleStartSession = () => {
    if (mode === "session" && !(username || "").trim()) return;
    setShowSetup(false);
  };

  const handleReconnect = async () => {
    connected.current = false;
    connectedOnce.current = false;
    vnc.disconnect();
    try {
      setIsNetBirdConnecting(true);
      await client.connectTemporary(peer.id!, ["netbird-vnc/25900"]);
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

  // Show disconnected screen with reconnect after session drops.
  if (vnc.status === VNCStatus.DISCONNECTED && connectedOnce.current && !isLoading) {
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
          <div className="text-sm text-nb-gray-400">{vnc.error}</div>
        )}
      </div>
    );
  }

  return (
    <>
      {isLoading && <FullScreenLoading />}

      {vnc.status === VNCStatus.CONNECTED && peerOSType === OperatingSystem.WINDOWS && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 group px-4 pt-0 pb-4">
          <div className="h-2 w-24 bg-nb-gray-500/60 group-hover:bg-nb-gray-400/80 rounded-b-lg mx-auto cursor-pointer transition-colors" />
          <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-200 ease-out">
            <div className="flex gap-1 bg-nb-gray-900/95 backdrop-blur border border-nb-gray-700 rounded-md px-2 py-1.5 shadow-lg mt-1">
              <button
                onClick={vnc.sendCtrlAltDel}
                className="text-xs text-nb-gray-300 hover:text-white px-3 py-1 rounded hover:bg-nb-gray-700 transition-colors whitespace-nowrap"
                title="Send Ctrl+Alt+Del to remote machine"
              >
                Ctrl+Alt+Del
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={vnc.containerRef}
        onContextMenu={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        className={
          vnc.status === VNCStatus.CONNECTED
            ? "w-full h-full bg-black vnc-cursor"
            : "hidden"
        }
      />
    </>
  );
}
