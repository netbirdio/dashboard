import * as React from "react";
import { useState } from "react";
import { GroupedRoute } from "@/interfaces/Route";
import RouteAddRoutingPeerModal from "@/modules/routes/RouteAddRoutingPeerModal";

type Props = {
  children: React.ReactNode;
};

const GroupedRouteContext = React.createContext(
  {} as {
    openAddRoutingPeerModal: (groupedRoute: GroupedRoute) => void;
  },
);

export const RouteAddRoutingPeerProvider = ({ children }: Props) => {
  const [groupedRoute, setGroupedRoute] = useState<GroupedRoute>();
  const [modal, setModal] = useState(false);
  const openAddRoutingPeerModal = (groupedRoute: GroupedRoute) => {
    setGroupedRoute(groupedRoute);
    setModal(true);
  };

  return (
    <GroupedRouteContext.Provider value={{ openAddRoutingPeerModal }}>
      {children}
      {modal && groupedRoute && (
        <RouteAddRoutingPeerModal
          groupedRoute={groupedRoute}
          modal={modal}
          setModal={setModal}
        />
      )}
    </GroupedRouteContext.Provider>
  );
};

export const useAddRoutingPeer = () => {
  const context = React.useContext(GroupedRouteContext);
  if (context === undefined) {
    throw new Error(
      "useGroupedRoute must be used within a GroupedRouteProvider",
    );
  }
  return context;
};
