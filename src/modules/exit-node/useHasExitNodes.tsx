import useFetchApi from "@utils/api";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";

export const useHasExitNodes = (peer?: Peer) => {
  const { data: routes } = useFetchApi<Route[]>(`/routes`);
  return peer
    ? routes?.some((route) => route?.peer === peer.id) || false
    : false;
};
