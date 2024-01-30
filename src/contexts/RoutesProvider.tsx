import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import React from "react";
import { useSWRConfig } from "swr";
import { Route } from "@/interfaces/Route";

type Props = {
  children: React.ReactNode;
};

const RoutesContext = React.createContext(
  {} as {
    createRoute: (
      route: Route,
      onSuccess?: (route: Route) => void,
      message?: string,
    ) => void;
    updateRoute: (
      route: Route,
      toUpdate: Partial<Route>,
      onSuccess?: (route: Route) => void,
      message?: string,
    ) => void;
  },
);

export default function RoutesProvider({ children }: Props) {
  const routeRequest = useApiCall<Route>("/routes");
  const { mutate } = useSWRConfig();

  const updateRoute = async (
    route: Route,
    toUpdate: Partial<Route>,
    onSuccess?: (route: Route) => void,
    message?: string,
  ) => {
    notify({
      title: "Network " + route.network_id + "-" + route.network,
      description: message
        ? message
        : "The network route was successfully updated",
      promise: routeRequest
        .put(
          {
            network_id: route.network_id,
            description: toUpdate.description ?? route.description ?? "",
            enabled: toUpdate.enabled ?? route.enabled,
            peer: toUpdate.peer ?? (route.peer || undefined),
            peer_groups:
              toUpdate.peer_groups ?? (route.peer_groups || undefined),
            network: route.network,
            metric: toUpdate.metric ?? route.metric ?? 9999,
            masquerade: toUpdate.masquerade ?? route.masquerade ?? true,
            groups: toUpdate.groups ?? route.groups ?? [],
          },
          `/${route.id}`,
        )
        .then((route) => {
          mutate("/groups");
          onSuccess && onSuccess(route);
        }),
      loadingMessage: "Updating route...",
    });
  };

  const createRoute = async (
    route: Route,
    onSuccess?: (route: Route) => void,
    message?: string,
  ) => {
    notify({
      title: "Network " + route.network_id + "-" + route.network,
      description: message
        ? message
        : "The network route was successfully created",
      promise: routeRequest
        .post({
          network_id: route.network_id,
          description: route.description || "",
          enabled: route.enabled,
          peer: route.peer || undefined,
          peer_groups: route.peer_groups || undefined,
          network: route.network,
          metric: route.metric || 9999,
          masquerade: route.masquerade,
          groups: route.groups || [],
        })
        .then((route) => {
          mutate("/routes");
          mutate("/groups");
          onSuccess && onSuccess(route);
        }),
      loadingMessage: "Creating route...",
    });
  };

  return (
    <RoutesContext.Provider value={{ createRoute, updateRoute }}>
      {children}
    </RoutesContext.Provider>
  );
}

export const useRoutes = () => {
  return React.useContext(RoutesContext);
};
