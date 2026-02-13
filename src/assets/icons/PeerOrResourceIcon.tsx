import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { PeerOSIcon } from "./PeerOSIcon";
import { ResourceIcon } from "./ResourceIcon";

type Props = {
  peer?: Peer;
  resource?: NetworkResource;
};

export const PeerOrResourceIcon = ({ peer, resource }: Props) => {
  return (
    <>
      {peer && <PeerOSIcon os={peer.os} />}
      {resource?.type && <ResourceIcon type={resource.type} />}
    </>
  );
};
