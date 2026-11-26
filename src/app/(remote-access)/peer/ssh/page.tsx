"use client";

import { PageNotFound } from "@components/ui/PageNotFound";
import useFetchApi, { ErrorResponse } from "@utils/api";
import { CircleXIcon, InfoIcon, Loader2Icon } from "lucide-react";
import React, { useEffect, useRef } from "react";
import type { Peer } from "@/interfaces/Peer";
import { Terminal } from "@/modules/remote-access/ssh/Terminal";
import { SSHStatus, useSSH } from "@/modules/remote-access/ssh/useSSH";
import { useSSHQueryParams } from "@/modules/remote-access/ssh/useSSHQueryParams";
import {
  NetBirdStatus,
  useNetBirdClient,
} from "@/modules/remote-access/useNetBirdClient";
import {
  usesStandardSSHPort,
  isNetbirdSSHProtocolSupported,
} from "@utils/version";

export default function SSHPage() {
  const { peerId, username, port, ipVersion } = useSSHQueryParams();

  const {
    data: peer,
    isLoading,
    error,
  } = useFetchApi<Peer>(`/peers/${peerId}`, true, false, !!peerId);

  if (error) {
    return (
      <div className={"w-screen h-screen overflow-hidden"}>
        <ErrorMessage
          error={{
            message:
              "This peer may have been deleted, or you may not have permission to view it.",
            code: error.code,
          }}
        />
      </div>
    );
  }

  return (
    <div className={"w-screen h-screen overflow-hidden"}>
      {peerId && peer && !isLoading && username && port ? (
        <SSHTerminal
          key={`${peer.id}-${ipVersion ?? ""}`}
          peer={peer}
          username={username}
          port={port}
          ipVersion={ipVersion}
        />
      ) : (
        <LoadingMessage message={"Starting ssh session..."} />
      )}
    </div>
  );
}

type Props = {
  username: string;
  port: string;
  peer: Peer;
  ipVersion: string | null;
};

function SSHTerminal({ username, port, peer, ipVersion }: Props) {
  const client = useNetBirdClient();
  const connected = useRef(false);
  const sshConnectedOnce = useRef(false);
  // The startup below awaits the overlay and the dial. A terminal that was
  // replaced meanwhile (the IP version changed) must not leave a connection
  // behind that nothing owns.
  const unmounted = useRef(false);
  // Set while the Reconnect button is bringing the overlay and the session up.
  const reconnecting = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);

  const {
    connect: ssh,
    disconnect,
    status,
    session,
    error: sshError,
  } = useSSH(client);

  const isSSHConnecting = status === SSHStatus.CONNECTING;
  const isSSHConnected = status === SSHStatus.CONNECTED;
  const isSSHDisconnected = status === SSHStatus.DISCONNECTED;
  const isClientDisconnected = client.status === NetBirdStatus.DISCONNECTED;
  const isClientConnecting = client.status === NetBirdStatus.CONNECTING;

  // Dial the IPv6 address when ip_version=6 is requested and the peer has one,
  // IPv4 otherwise. peer.ip is always IPv4, so a request for "6" on a peer
  // without an IPv6 address has to fall back on the version too, or the dialer
  // is told to use a family the host doesn't belong to.
  const requestedIPv6 = ipVersion === "6" && peer.ipv6 ? peer.ipv6 : undefined;
  const sshHost = requestedIPv6 ?? peer.ip;
  const sshIpVersion =
    ipVersion === "6" ? (requestedIPv6 ? "6" : "4") : ipVersion;

  useEffect(() => {
    document.title = `${username}@${sshHost} - ${peer.hostname}`;
  }, [username, peer, client, sshHost]);

  const handleReconnect = async () => {
    if (!peer?.id) return;
    if (isSSHConnected || isSSHConnecting) return;
    connected.current = false;
    reconnecting.current = true;
    try {
      const aclPort = usesStandardSSHPort(peer.version) ? "22022" : port;
      const protocol = isNetbirdSSHProtocolSupported(peer.version)
        ? "netbird-ssh"
        : "tcp";
      const rules = [`${protocol}/${aclPort}`];
      await client?.connectTemporary(peer.id, rules);
      if (unmounted.current) return;
      await ssh({
        hostname: sshHost,
        port: Number(port),
        username,
        ipVersion: sshIpVersion || undefined,
      });
      if (unmounted.current) disconnect();
    } catch (error) {
      console.error("Reconnection failed:", error);
    } finally {
      reconnecting.current = false;
    }
  };

  useEffect(() => {
    if (isSSHConnected || isSSHConnecting) return;
    if (isClientConnecting) return;
    // A terminal that replaced another one finds the overlay already up and
    // adopts it. Once this terminal has started, or while Reconnect is
    // bringing the overlay up itself, a connected client is left alone.
    const overlayUp = client.status === NetBirdStatus.CONNECTED;
    if (overlayUp && (connected.current || reconnecting.current)) return;

    const connect = async () => {
      if (!peer.id) return;
      if (connected.current) return;
      connected.current = true;

      try {
        const aclPort = usesStandardSSHPort(peer.version) ? "22022" : port;
        const protocol = isNetbirdSSHProtocolSupported(peer.version)
          ? "netbird-ssh"
          : "tcp";
        const rules = [`${protocol}/${aclPort}`];
        if (!overlayUp) {
          await client?.connectTemporary(peer.id, rules);
        }
        if (unmounted.current) return;
        const res = await ssh({
          hostname: sshHost,
          port: Number(port),
          username,
          ipVersion: sshIpVersion || undefined,
        });
        if (unmounted.current) {
          disconnect();
          return;
        }
        if (res === SSHStatus.CONNECTED) {
          sshConnectedOnce.current = true;
        }
      } catch (error) {
        console.error("Connection error:", error);
      }
    };

    if (isClientDisconnected || overlayUp) connect().catch(console.error);
  }, [
    isClientDisconnected,
    isSSHConnected,
    isSSHConnecting,
    isClientConnecting,
    peer.id,
    peer.version,
    port,
    ssh,
    disconnect,
    sshHost,
    sshIpVersion,
    username,
    client.connectTemporary,
    client.status,
  ]);

  if (client.error) {
    return <ErrorMessage error={{ message: client.error, code: 0 }} />;
  }

  if (sshError) {
    return <ErrorMessage error={{ message: sshError, code: 0 }} />;
  }

  if (isSSHDisconnected && sshConnectedOnce.current) {
    return (
      <DisconnectedMessage
        username={username}
        peerIp={sshHost}
        onReconnect={handleReconnect}
      />
    );
  }

  return (
    <>
      {session && <Terminal session={session} onClose={disconnect} />}
      {!isSSHConnected && (
        <LoadingMessage message={`Connecting to ${username}@${sshHost}...`} />
      )}
    </>
  );
}

type MessageProps = {
  message?: string;
  error?: ErrorResponse;
};

const LoadingMessage = ({ message }: MessageProps) => {
  return (
    <div
      className={
        "w-full h-full flex items-center justify-center flex-col text-center"
      }
    >
      <div className="text-nb-gray-200 font-normal text-base flex gap-2 items-center justify-center">
        <Loader2Icon size={16} className={"animate-spin shrink-0"} />
        {message}
      </div>
    </div>
  );
};

const ErrorMessage = ({ error }: MessageProps) => {
  return (
    <div
      className={
        "w-full h-full flex items-center justify-center flex-col text-center"
      }
    >
      <div className="text-nb-gray-200 font-normal text-base flex gap-2 items-center justify-center">
        <CircleXIcon size={16} className={"shrink-0 text-red-500"} />
        {error?.message}
      </div>
    </div>
  );
};

type DisconnectedMessageProps = {
  username: string;
  peerIp: string;
  onReconnect: () => void;
};

const DisconnectedMessage = ({
  username,
  peerIp,
  onReconnect,
}: DisconnectedMessageProps) => {
  return (
    <div
      className={
        "w-full h-full flex items-center justify-center flex-col text-center gap-4"
      }
    >
      <div className="text-nb-gray-200 font-normal text-base flex gap-2 items-center justify-center">
        <InfoIcon size={16} className={"shrink-0 text-nb-gray-200"} />
        Disconnected from {username}@{peerIp}
        <button
          className={
            "underline-offset-4 items-center transition-all duration-200 inline-flex texts-inherit gap-1 text-netbird hover:underline font-normal"
          }
          onClick={onReconnect}
        >
          Reconnect
        </button>
      </div>
    </div>
  );
};
