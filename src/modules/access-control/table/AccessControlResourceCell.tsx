import ResourceBadge from "@components/ui/ResourceBadge";
import useFetchApi from "@utils/api";
import * as React from "react";
import Skeleton from "react-loading-skeleton";
import { ExitNode } from "@/interfaces/ExitNode";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { PolicyRuleResource } from "@/interfaces/Policy";

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
  const { data: exitNodes, isLoading } = useFetchApi<ExitNode[]>("/exit-nodes");

  if (isLoading) return <Skeleton height={35} width={"50%"} />;

  const exitNode = exitNodes?.find((e) => e.id === resource?.id);

  return (
    <div className={"flex"}>
      <ResourceBadge
        exitNode={{
          id: resource?.id ?? "",
          name: exitNode?.name ?? "Deleted exit node",
        }}
      />
    </div>
  );
};
