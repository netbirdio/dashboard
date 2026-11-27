import ResourceBadge from "@components/ui/ResourceBadge";
import useFetchApi from "@utils/api";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { ExitNode } from "@/interfaces/ExitNode";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { PolicyRuleResource } from "@/interfaces/Policy";
import { useExitNodePermissions } from "@/modules/exit-nodes/useExitNodePermissions";

type Props = {
  resource?: PolicyRuleResource;
};

export const AccessControlResourceCell = ({ resource }: Props) => {
  if (resource?.type === "exit_node")
    return <AccessControlExitNodeCell resource={resource} />;
  return <AccessControlNetworkResourceCell resource={resource} />;
};

const AccessControlNetworkResourceCell = ({ resource }: Props) => {
  const { data: resources, isLoading: isLoadingResources } = useFetchApi<
    NetworkResource[]
  >("/networks/resources");
  const { data: peers, isLoading: isLoadingPeers } =
    useFetchApi<Peer[]>("/peers");

  const isPeer = resource?.type === "peer";
  const peer = peers?.find((p) => p.id === resource?.id);

  if ((isPeer && isLoadingPeers) || (!isPeer && isLoadingResources))
    return <Skeleton height={35} width={"50%"} />;

  return (
    <div className={"flex"}>
      <ResourceBadge
        resource={resources?.find((r) => r.id === resource?.id)}
        peer={peer}
      />
    </div>
  );
};

const AccessControlExitNodeCell = ({ resource }: Props) => {
  const canRead = !!useExitNodePermissions()?.read;
  const {
    data: exitNodes,
    error,
    isLoading,
  } = useFetchApi<ExitNode[]>("/exit-nodes", false, true, canRead);

  if (isLoading) return <Skeleton height={35} width={"50%"} />;

  const exitNode = exitNodes?.find((e) => e.id === resource?.id);
  // "Deleted" only when the list loaded and the node isn't in it; a failed
  // or skipped lookup says nothing about whether it still exists.
  const loaded = canRead && !error && exitNodes !== undefined;
  const fallback = loaded ? "Deleted exit node" : "Exit node";

  return (
    <div className={"flex"} data-testid={"policy-exit-node-destination"}>
      <ResourceBadge
        exitNode={{
          id: resource?.id ?? "",
          name: exitNode?.name ?? fallback,
        }}
      />
    </div>
  );
};
