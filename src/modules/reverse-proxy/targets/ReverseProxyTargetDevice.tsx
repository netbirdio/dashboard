import * as React from "react";
import useFetchApi from "@utils/api";
import { useRouter } from "next/navigation";
import type { Peer } from "@/interfaces/Peer";
import { DeviceCard } from "@components/DeviceCard";
import { Network, NetworkResource } from "@/interfaces/Network";
import {
  ReverseProxyTarget,
  ReversProxyTargetType,
} from "@/interfaces/ReverseProxy";
import { isResourceTargetType } from "@/contexts/ReverseProxiesProvider";
import { cn } from "@utils/helpers";
import { ArrowUpRight } from "lucide-react";
import { SkeletonDeviceCard } from "@components/skeletons/SkeletonDeviceCard";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  target: ReverseProxyTarget;
  showDescription?: boolean;
};

export const ReverseProxyTargetDevice = ({
  target,
  showDescription,
}: Props) => {
  const router = useRouter();
  const { data: peers, isLoading: isPeersLoading } =
    useFetchApi<Peer[]>(`/peers`);
  const { data: resources, isLoading: isResourceLoading } =
    useFetchApi<NetworkResource[]>(`/networks/resources`);
  const { data: networks, isLoading: isNetworksLoading } =
    useFetchApi<Network[]>(`/networks`);

  const isPeer = target.target_type === ReversProxyTargetType.PEER;
  const isResource = isResourceTargetType(target.target_type);

  const peer = isPeer
    ? peers?.find((p) => p.id === target.target_id)
    : undefined;
  const resource = isResource
    ? resources?.find((r) => r.id === target.target_id)
    : undefined;

  const network =
    isResource && resource
      ? networks?.find((n) => n.resources?.includes(resource.id))
      : undefined;

  const handleClick = () => {
    if (isPeer && peer) {
      router.push(`/peer?id=${peer.id}`);
    } else if (isResource && resource && network) {
      router.push(`/network?id=${network.id}&resource=${resource.id}`);
    }
  };

  if (isPeersLoading || isResourceLoading || isNetworksLoading)
    return <SkeletonDeviceCard />;

  if (!peer && !resource)
    return (
      <div className={"min-h-[59px] flex items-center relative left-1"}>
        <EmptyRow />
      </div>
    );

  return (
    <div className={"min-h-[59px] flex items-center relative -left-2"}>
      <div
        className={cn(
          "cursor-pointer rounded-md hover:bg-nb-gray-900/40 flex items-center justify-between group pr-4",
        )}
        onClick={handleClick}
      >
        <DeviceCard
          device={peer}
          className={cn(!target.enabled && "opacity-40", "pl-2")}
          resource={resource}
          description={showDescription ? resource?.description : undefined}
        />
        <ArrowUpRight
          size={14}
          className={"text-nb-gray-200 opacity-0 group-hover:opacity-100"}
        />
      </div>
    </div>
  );
};
