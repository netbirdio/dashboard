import useFetchApi from "@utils/api";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";

export const useHasExitNodes = (peer?: Peer) => {
  const { isOwnerOrAdmin } = useLoggedInUser();
  const { data: routes } = useFetchApi<Route[]>(
    `/routes`,
    false,
    true,
    isOwnerOrAdmin,
  );
  return peer
    ? routes?.some(
        (route) => route?.peer === peer.id && route?.network === "0.0.0.0/0",
      ) || false
    : false;
};
