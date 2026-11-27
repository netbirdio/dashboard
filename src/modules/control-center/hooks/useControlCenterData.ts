import { SelectOption } from "@components/select/SelectDropdown";
import useFetchApi from "@utils/api";
import { sortBy } from "lodash";
import { LayoutGridIcon, NetworkIcon } from "lucide-react";
import React, { useMemo } from "react";
import { ExitNode } from "@/interfaces/ExitNode";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { User } from "@/interfaces/User";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

export function useControlCenterData() {
  const { data: policies, isLoading: isPoliciesLoading } =
    useFetchApi<Policy[]>("/policies");
  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>("/peers");
  const { data: networks, isLoading: isNetworksLoading } =
    useFetchApi<Network[]>("/networks");
  const { data: networkResources, isLoading: isResourcesLoading } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");
  const { data: groups, isLoading: isGroupsLoading } =
    useFetchApi<Group[]>("/groups");
  // Control Center opens on `policies.read`, which does not imply `users.read`:
  // for those roles the users call is a plain 403 and must not raise the error
  // boundary over a canvas that reads fine without it. Every consumer treats an
  // absent list as "no users", and the group panel's Users tab is gated on
  // `users.update` anyway.
  const { data: users, isLoading: isUsersLoading } = useFetchApi<User[]>(
    "/users?service_user=false",
    true,
  );

  // Exit nodes draw exit-node policies' destinations. Optional like users:
  // management builds without the exit nodes API answer 404, and the canvas
  // reads fine without them (the destination shows as an unknown exit node).
  // Their loading still counts: the live view is built once, when loading
  // ends, and would otherwise show every exit node as unknown.
  const canReadExitNodes = !!useExitNodePermissions()?.read;
  const { data: exitNodes, isLoading: isExitNodesLoading } = useFetchApi<
    ExitNode[]
  >("/exit-nodes", true, true, canReadExitNodes);

  const isLoading =
    isPoliciesLoading ||
    isPeersLoading ||
    isNetworksLoading ||
    isResourcesLoading ||
    isGroupsLoading ||
    isUsersLoading ||
    isExitNodesLoading;

  const networkOptions: SelectOption[] = useMemo(() => {
    const allNetworks = sortBy(
      networks?.map(
        (network) =>
          ({
            value: network.id,
            label: network.name,
            icon: NetworkIcon,
          }) as SelectOption,
      ) || [],
      "label",
    );
    allNetworks.unshift({
      value: "",
      label: "All Networks",
      icon: () => React.createElement(LayoutGridIcon, { size: 14 }),
    } as SelectOption);
    return allNetworks;
  }, [networks]);

  const isDataReady = (): boolean =>
    !!policies &&
    !!peers &&
    !!groups &&
    !!networks &&
    !!networkResources &&
    !isLoading;

  return {
    policies,
    peers,
    networks,
    networkResources,
    groups,
    users,
    exitNodes,
    isPeersLoading,
    isNetworksLoading,
    isLoading,
    isDataReady,
    networkOptions,
  };
}
