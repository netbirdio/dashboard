import React from "react";
import { GroupedRoute } from "@/interfaces/Route";

type Props = {
  children: React.ReactNode;
  groupedRoute: GroupedRoute;
};

const GroupRouteContext = React.createContext(
  {} as {
    groupedRoute: GroupedRoute;
  },
);

export default function GroupRouteProvider({ children, groupedRoute }: Props) {
  return (
    <GroupRouteContext.Provider value={{ groupedRoute }}>
      {children}
    </GroupRouteContext.Provider>
  );
}

export const useGroupRoute = () => {
  return React.useContext(GroupRouteContext);
};
