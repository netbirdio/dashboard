"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import useFetchApi from "@utils/api";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import { sendErrorNotification } from "@/modules/remote-access/errorNotification";
import {
  hasReportedCursor,
  isNetBirdVNCSupportedOnOS,
} from "@/modules/remote-access/osSupport";
import {
  NetBirdStatus,
  useNetBirdClient,
} from "@/modules/remote-access/useNetBirdClient";
import {
  useVNC,
  type VNCMode,
  VNCStatus,
  type VNCTarget,
} from "@/modules/remote-access/vnc/useVNC";
import {
  useVNCQueryParams,
  type VNCSettings,
} from "@/modules/remote-access/vnc/useVNCQueryParams";
import {
  type VNCConnectChoice,
  VNCConnectModal,
} from "@/modules/remote-access/vnc/VNCConnectModal";
import { VNCPasswordModal } from "@/modules/remote-access/vnc/VNCPasswordModal";
import VNCToolbar from "@/modules/remote-access/vnc/VNCToolbar";

// Network range exposed by the NetBird agent for the embedded VNC server.
// Must match the listener registered in client/vnc/server on the peer side.
const VNC_NETWORK_RANGE = "netbird-vnc/25900";

// temporaryAccessRules names the port the grant has to open. NetBird's server
// is behind its own named range; a third-party one is an ordinary TCP port on
// the peer, so the grant is scoped to exactly that port and nothing else.
const temporaryAccessRules = (target: VNCTarget, port: number) =>
  target === "external" ? [`tcp/${port}`] : [VNC_NETWORK_RANGE];

export default function VNCPage() {
  const {
    peerId,
    mode: initialMode,
    username: initialUser,
    ipVersion,
    target: initialTarget,
    port: initialPort,
    settings,
    ready,
  } = useVNCQueryParams();

  const { data: peer, isLoading: isPeerLoading } = useFetchApi<Peer>(
    `/peers/${peerId}`,
    true,
    false,
    !!peerId,
  );

  return (
    <div className="w-screen h-screen overflow-hidden fixed inset-0">
      {peerId && peer && !isPeerLoading ? (
        <VNCSession
          key={peer.id}
          peer={peer}
          initialMode={initialMode}
          initialUsername={initialUser}
          ipVersion={ipVersion}
          initialTarget={initialTarget}
          initialPort={initialPort}
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
  initialTarget: VNCTarget;
  initialPort: number;
  settings: VNCSettings;
};

function VNCSession({
  peer,
  initialMode,
  initialUsername,
  ipVersion,
  initialTarget,
  initialPort,
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
  // grantedScope records what the current temporary access was opened for, so
  // a later change of server or port is noticed rather than silently dialing
  // a port no policy covers.
  const grantedScope = useRef<string | null>(null);

  const peerOSType = getOperatingSystem(peer?.os);
  // The NetBird path needs both halves: a capturer shipped for this system,
  // and the server switched on. They are kept apart because the advice
  // differs, "enable it" being useless where there is nothing to enable.
  const netbirdSupported = isNetBirdVNCSupportedOnOS(peer?.os);
  const netbirdEnabled = !!peer?.local_flags?.server_vnc_allowed;
  const netbirdAvailable = netbirdSupported && netbirdEnabled;
  const supportsSessionMode =
    peerOSType === OperatingSystem.LINUX ||
    peerOSType === OperatingSystem.FREEBSD;

  // The committed decision. The modal keeps the draft and hands it over on
  // Connect, so nothing here changes while the operator is still choosing.
  const [choice, setChoice] = useState<VNCConnectChoice>({
    target: netbirdAvailable ? initialTarget : "external",
    port: initialPort,
    mode: initialMode,
    username: initialUsername,
    ipVersion: ipVersion === "4" || ipVersion === "6" ? ipVersion : "",
  });
  const { target, port: portNumber, mode, username, ipVersion: ipVer } = choice;
  const isExternal = target === "external";

  // The setup screen is shown whenever there is something to decide: which
  // server to use when NetBird's is unavailable or the caller asked for the
  // external one, or which session to attach to on the systems that offer a
  // choice. A peer with NetBird screen sharing on and no session choice has
  // nothing to ask, so it connects straight away as it always did.
  const [showSetup, setShowSetup] = useState(
    supportsSessionMode || !netbirdAvailable || initialTarget === "external",
  );
  // Whether returning to the setup screen would give the operator anything to
  // change. A failed external connection always does: the port is theirs to
  // correct.
  const hasSetupChoices = supportsSessionMode || isExternal || !netbirdAvailable;

  useEffect(() => {
    document.title = `${peer.name} - ${peer.ip} - VNC`;
  }, [peer.ip, peer.name]);

  const connectNetBird = useCallback(async () => {
    if (!peer?.id) return;

    const rules = temporaryAccessRules(target, portNumber);
    const scope = rules.join(",");

    // The grant is scoped to the port it was asked for, so a different server
    // or port needs a fresh one. Without this the dial would be dropped by a
    // policy that covers the previous choice and the failure would look like
    // the peer's fault.
    if (
      client.status === NetBirdStatus.CONNECTED &&
      grantedScope.current !== null &&
      grantedScope.current !== scope
    ) {
      try {
        await client.disconnect();
        grantedScope.current = null;
      } catch (error) {
        sendErrorNotification(
          "NetBird Connection Error",
          (error as Error).message,
        );
        return;
      }
    }

    if (client.status !== NetBirdStatus.DISCONNECTED) return;

    try {
      setIsNetBirdConnecting(true);
      const result = await client.connectTemporary(peer.id!, rules);
      grantedScope.current = scope;
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
  }, [peer?.id, client, sendErrorNotification, target, portNumber]);

  // Held back until the setup screen is done with, the way RDP and SSH hold
  // theirs until the credentials dialog is answered. Bringing the overlay up
  // registers a peer and opens a temporary access policy, so it waits for the
  // operator to have chosen what to open it for.
  useEffect(() => {
    if (
      client.status === NetBirdStatus.DISCONNECTED &&
      !showSetup &&
      !isNetBirdConnecting &&
      !connected.current &&
      !connectFailed
    ) {
      connectNetBird().catch(console.error);
    }
  }, [
    client.status,
    connectNetBird,
    isNetBirdConnecting,
    connectFailed,
    showSetup,
  ]);

  // Start VNC session when NetBird is connected (auto-connect unless setup is shown).
  useEffect(() => {
    if (
      client.status === NetBirdStatus.CONNECTED &&
      vnc.status === VNCStatus.DISCONNECTED &&
      !connected.current &&
      !isNetBirdConnecting &&
      !showSetup &&
      !connectFailed &&
      // Only the NetBird path is authenticated by a session key, so only it
      // waits for one. Requiring it for an external connection would hang
      // forever on a grant that never carries one.
      (isExternal || (targetPubKey && keySessionId))
    ) {
      connected.current = true;
      vnc
        .connect({
          hostname: peer.dns_label || peer.ip,
          port: isExternal ? portNumber : 5900,
          target,
          mode,
          ipVersion: ipVer || undefined,
          username: mode === "session" ? username : undefined,
          width: mode === "session" ? window.innerWidth : undefined,
          height: mode === "session" ? window.innerHeight : undefined,
          scale: settings.scale,
          resize: settings.resize,
          quality: settings.quality,
          dotCursor: settings.dotCursor,
          peerPublicKey: isExternal ? undefined : targetPubKey,
          keySessionId: isExternal ? undefined : keySessionId,
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
    isExternal,
    target,
    portNumber,
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
        if (hasSetupChoices) {
          setShowSetup(true);
        }
      }
    }
    if (client.error) {
      sendErrorNotification("NetBird Client Error", client.error);
    }
  }, [vnc.error, client.error, hasSetupChoices, sendErrorNotification]);

  const handleConnectChoice = (next: VNCConnectChoice) => {
    setChoice(next);
    setShowSetup(false);
    setConnectFailed(false);
  };

  const handleReconnect = async () => {
    connected.current = false;
    connectedOnce.current = false;
    setConnectFailed(false);
    vnc.disconnect();
    await connectNetBird();
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
    if (client.status === NetBirdStatus.CONNECTING)
      return "Bringing up NetBird overlay…";
    if (vnc.status === VNCStatus.CONNECTING) {
      return vncWaitElapsed
        ? "Connecting to VNC server… the peer may be prompting its user for approval."
        : "Connecting to VNC server…";
    }
    return undefined;
  })();

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
      {showSetup && (
        <VNCConnectModal
          open={true}
          peer={peer}
          netbirdSupported={netbirdSupported}
          netbirdEnabled={netbirdEnabled}
          initial={choice}
          error={vnc.error || undefined}
          loading={isLoading}
          onConnect={handleConnectChoice}
        />
      )}

      {isLoading && !vnc.credentialsRequired && !showSetup && (
        <FullScreenLoading label={loadingLabel} />
      )}

      {vnc.credentialsRequired && (
        <VNCPasswordModal
          open={true}
          peerName={peer.name}
          port={portNumber}
          onSubmit={vnc.sendPassword}
          onCancel={vnc.disconnect}
        />
      )}

      {vnc.status === VNCStatus.CONNECTED && (
        <VNCToolbar
          external={isExternal}
          onCtrlAltDel={
            peerOSType === OperatingSystem.WINDOWS
              ? vnc.sendCtrlAltDel
              : undefined
          }
          onPaste={vnc.viewOnly ? undefined : vnc.pasteFromHostClipboard}
          showRemoteCursor={vnc.showRemoteCursor}
          onToggleRemoteCursor={
            // The remote cursor is requested with a NetBird-specific RFB
            // message, so the control has nothing to switch on an external
            // server and is left out rather than shown doing nothing.
            isExternal || vnc.viewOnly || !hasReportedCursor(peer?.os)
              ? undefined
              : vnc.setShowRemoteCursor
          }
          viewOnly={vnc.viewOnly}
          onDisconnect={vnc.disconnect}
        />
      )}

      <div
        ref={vnc.containerRef}
        tabIndex={-1}
        onKeyDownCapture={vnc.handlePasteShortcut}
        onContextMenu={(e) => e.preventDefault()}
        // The paste is handled from the keydown instead. Chromium delivers this
        // event even when the keydown was preventDefault'd, so acting on both
        // would type the clipboard twice.
        onPaste={(e) => e.preventDefault()}
        className={
          vnc.status === VNCStatus.CONNECTED
            ? "w-full h-full bg-black vnc-cursor outline-none" +
              // In view-only mode the host cursor is baked into the
              // framebuffer but the viewer still needs to see their own
              // pointer for orientation, so we keep the local cursor
              // visible. In control mode we hide it to avoid two cursors
              // tracking together.
              (vnc.showRemoteCursor && !vnc.viewOnly
                ? " vnc-cursor-remote"
                : "")
            : "hidden"
        }
      />
    </>
  );
}
