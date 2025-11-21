"use client";

import { PageNotFound } from "@components/ui/PageNotFound";
import useFetchApi, { ErrorResponse } from "@utils/api";
import { isNativeSSHSupported } from "@utils/version";
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

export default function SSHPage() {
  const { peerId, username, port } = useSSHQueryParams();

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
          key={peer.id}
          peer={peer}
          username={username}
          port={port}
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
};

function SSHTerminal({ username, port, peer }: Props) {
  const client = useNetBirdClient();
  const connected = useRef(false);
  const sshConnectedOnce = useRef(false);

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

  useEffect(() => {
    document.title = `${username}@${peer.ip} - ${peer.hostname}`;
  }, [username, peer, client]);

  const handleReconnect = async () => {
    if (!peer?.id) return;
    if (isSSHConnected || isSSHConnecting) return;
    connected.current = false;
    try {
      const aclPort = isNativeSSHSupported(peer.version) ? "22022" : port;
      const rules = [`tcp/${aclPort}`];
      await client?.connectTemporary(peer.id, rules);
      await ssh({
        hostname: peer.ip,
        port: Number(port),
        username,
      });
    } catch (error) {
      console.error("Reconnection failed:", error);
    }
  };

  useEffect(() => {
    if (isSSHConnected || isSSHConnecting) return;
    if (isClientConnecting || client.status === NetBirdStatus.CONNECTED) return;

    const connect = async () => {
      if (!peer.id) return;
      if (connected.current) return;
      connected.current = true;

      try {
        const aclPort = isNativeSSHSupported(peer.version) ? "22022" : port;
        const rules = [`tcp/${aclPort}`];
        await client?.connectTemporary(peer.id, rules);
        const res = await ssh({
          hostname: peer.ip,
          port: Number(port),
          username,
        });
        if (res === SSHStatus.CONNECTED) {
          sshConnectedOnce.current = true;
        }
      } catch (error) {
        console.error("Connection error:", error);
      }
    };

    if (isClientDisconnected) connect().catch(console.error);
  }, [
    isClientDisconnected,
    isSSHConnected,
    isSSHConnecting,
    isClientConnecting,
    peer.id,
    port,
    ssh,
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
        peerIp={peer.ip}
        onReconnect={handleReconnect}
      />
    );
  }

  return (
    <>
      {session && <Terminal session={session} onClose={disconnect} />}
      {!isSSHConnected && (
        <LoadingMessage message={`Connecting to ${username}@${peer.ip}...`} />
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
