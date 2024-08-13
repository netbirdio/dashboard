import useFetchApi from "@utils/api";
import React, { useMemo } from "react";
import type { Peer } from "@/interfaces/Peer";

type Props = {
  children: React.ReactNode;
};

const PeerContext = React.createContext(
  {} as {
    peers: Peer[] | undefined;
    isLoading: boolean;
  },
);

export default function PeersProvider({ children }: Readonly<Props>) {
  const { data: peers, isLoading } = useFetchApi<Peer[]>("/peers");

  const data = useMemo(() => {
    return {
      peers,
      isLoading,
    };
  }, [peers, isLoading]);

  return <PeerContext.Provider value={data}>{children}</PeerContext.Provider>;
}

export const usePeers = () => React.useContext(PeerContext);
