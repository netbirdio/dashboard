import useFetchApi from "@utils/api";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";

export interface ExitNodeInfo {
  hasExitNode: boolean;
  skipAutoApply?: boolean;
}

export const useHasExitNodes = (peer?: Peer): ExitNodeInfo => {
  const { isOwnerOrAdmin } = useLoggedInUser();
  const { data: routes } = useFetchApi<Route[]>(
    `/routes`,
    false,
    true,
    isOwnerOrAdmin,
  );
  
  if (!peer || !routes) {
    return { hasExitNode: false };
  }

  const exitNodeRoute = routes.find(
    (route) => route?.peer === peer.id && route?.network === "0.0.0.0/0",
  );

  return {
    hasExitNode: !!exitNodeRoute,
    skipAutoApply: exitNodeRoute?.skip_auto_apply,
  };
};
