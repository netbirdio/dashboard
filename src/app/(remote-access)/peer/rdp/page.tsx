"use client";

import { notify } from "@components/Notification";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { IconCircleX } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { Loader2Icon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Peer } from "@/interfaces/Peer";
import { RDPCertificateModal } from "@/modules/remote-access/rdp/RDPCertificateModal";
import { RDPCredentialsModal } from "@/modules/remote-access/rdp/RDPCredentialsModal";
import { useRDPQueryParams } from "@/modules/remote-access/rdp/useRDPQueryParams";
import {
  RDPCredentials,
  RDPStatus,
  useRemoteDesktop,
} from "@/modules/remote-access/rdp/useRemoteDesktop";
import {
  NetBirdStatus,
  useNetBirdClient,
} from "@/modules/remote-access/useNetBirdClient";

export default function RDPPage() {
  const { peerId } = useRDPQueryParams();

  const {
    data: peer,
    isLoading,
    error,
  } = useFetchApi<Peer>(`/peers/${peerId}`, true, false, !!peerId);

  return (
    <div className={"w-screen h-screen overflow-hidden fixed inset-0"}>
      {peerId && peer && !isLoading ? (
        <RDPSession key={peer.id} peer={peer} />
      ) : (
        <FullScreenLoading />
      )}
    </div>
  );
}

type Props = {
  peer: Peer;
};

function RDPSession({ peer }: Props) {
  const client = useNetBirdClient();
  const [isNetBirdConnecting, setIsNetBirdConnecting] = useState(false);
  const rdp = useRemoteDesktop(client);
  const [credentialsModal, setCredentialsModal] = useState(true);
  const [credentials, setCredentials] = useState<RDPCredentials | null>(null);
  const connected = useRef(false);

  useEffect(() => {
    document.title = `${peer.name} - ${peer.ip} - RDP`;
  }, [peer.ip, peer.name, connected, rdp]);

  const sendErrorNotification = (title: string, message: string) => {
    notify({
      title: title,
      description: message,
      icon: <IconCircleX size={24} />,
      backgroundColor: "bg-red-500",
      duration: 10000,
    });
  };

  const reset = useCallback(async () => {
    setCredentials(null);
    connected.current = false;
    setCredentialsModal(true);
    rdp.session?.disconnect();
    await client.disconnect();
  }, [client, rdp]);

  /**
   * Establishes a connection to the peer
   */
  const connect = async (rdpCredentials: RDPCredentials) => {
    if (!peer?.id) return;
    if (client.status === NetBirdStatus.DISCONNECTED) {
      try {
        setCredentials(rdpCredentials);
        setIsNetBirdConnecting(true);
        await client.connectTemporary(peer.id, [`tcp/${rdpCredentials.port}`]);
        setIsNetBirdConnecting(false);
      } catch (error) {
        sendErrorNotification(
          "NetBird Connection Error",
          (error as Error).message,
        );
        setIsNetBirdConnecting(false);
      }
    }
  };

  const startSession = useCallback(async () => {
    if (!credentials) return;
    try {
      const result = await rdp.connect({
        hostname: peer.ip,
        port: credentials.port,
        username: credentials.username,
        password: credentials.password,
        domain: credentials.domain,
        width: window.innerWidth,
        height: window.innerHeight,
      });
      if (result === RDPStatus.CONNECTED) {
        connected.current = true;
      } else {
      }
    } catch (error) {
      sendErrorNotification("RDP Connection Error", (error as Error).message);
      setCredentialsModal(true);
      await reset();
    }
  }, [credentials, peer.ip, rdp, reset]);

  /**
   * Establish RDP session when NetBird connection is ready
   */
  useEffect(() => {
    if (
      client.status === NetBirdStatus.CONNECTED &&
      rdp.status === RDPStatus.DISCONNECTED &&
      credentials &&
      !connected.current &&
      !isNetBirdConnecting
    ) {
      startSession().catch(console.error);
    }
  }, [
    client.status,
    credentials,
    peer.ip,
    rdp,
    startSession,
    isNetBirdConnecting,
  ]);

  /**
   * Display notifications for RDP and NetBird client errors
   */
  useEffect(() => {
    if (rdp.error) {
      sendErrorNotification("RDP Error", rdp.error);
    }
    if (client.error) {
      sendErrorNotification("NetBird Client Error", client.error);
    }
  }, [rdp, client]);

  /**
   * Close credentials modal when RDP is connected
   */
  useEffect(() => {
    if (rdp.status === RDPStatus.CONNECTED) {
      setCredentialsModal(false);
    }
  }, [rdp.status]);

  const isLoading =
    client.status === NetBirdStatus.CONNECTING ||
    rdp.status === RDPStatus.CONNECTING ||
    rdp.isResizing ||
    isNetBirdConnecting;

  return (
    <>
      {/* Credentials Modal */}
      <RDPCredentialsModal
        open={credentialsModal}
        peer={peer}
        onConnect={connect}
        loading={isLoading}
      />

      {/* Certificate Modal */}
      <RDPCertificateModal
        open={!!rdp.pendingCertificate}
        certificateInfo={rdp.pendingCertificate}
        onAccept={rdp.acceptCertificatePrompt}
        onReject={async () => {
          rdp.rejectCertificatePrompt();
          await reset();
        }}
      />

      {rdp.isResizing && (
        <div
          className={
            "fixed w-screen h-screen z-50 backdrop-blur bg-black/50 flex items-center justify-center"
          }
        >
          <Loader2Icon size={20} className={"animate-spin"} />
        </div>
      )}

      {/* RDP Canvas  */}
      <canvas
        ref={rdp.canvasRef}
        className={cn(
          rdp.status === RDPStatus.CONNECTED ? "block" : "hidden",
          "w-full h-full select-none bg-nb-gray-950",
        )}
        style={{ imageRendering: "pixelated" }}
      />
    </>
  );
}
