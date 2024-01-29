import useFetchApi from "@utils/api";
import React from "react";
import type { Peer } from "@/interfaces/Peer";

type Props = {
  children: React.ReactNode;
};

const PeerContext = React.createContext(
  {} as {
    peers: Peer[] | undefined;
  },
);

export default function PeersProvider({ children }: Props) {
  const { data: peers } = useFetchApi<Peer[]>("/peers");

  return (
    <PeerContext.Provider value={{ peers }}>{children}</PeerContext.Provider>
  );
}

export const usePeers = () => React.useContext(PeerContext);
