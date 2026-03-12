import Badge from "@components/Badge";
import Button from "@components/Button";
import { DeviceCard } from "@components/DeviceCard";
import useFetchApi from "@utils/api";
import { PlusCircle, Server } from "lucide-react";
import * as React from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxy, ReverseProxyTargetType, isL4Mode } from "@/interfaces/ReverseProxy";

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyTargetsCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openTargetModal } = useReverseProxies();

  if (isL4Mode(reverseProxy.mode)) {
    return <L4TargetDisplay reverseProxy={reverseProxy} />;
  }

  const targetsCount = reverseProxy?.targets?.length ?? 0;

  return (
    <div className={"flex gap-3"}>
      {targetsCount > 0 && (
        <Badge
          variant={"gray"}
          useHover={true}
          className={"cursor-pointer"}
          onClick={() => void 0}
        >
          <Server size={11} />
          <div>
            <span className={"font-medium text-xs"}>{targetsCount}</span>
          </div>
        </Badge>
      )}

      <Button
        size={"xs"}
        variant={"secondary"}
        onClick={(e) => {
          e.stopPropagation();
          openTargetModal({ proxy: reverseProxy });
        }}
        className={"!px-3"}
        disabled={!permission?.services?.create}
      >
        <PlusCircle size={12} />
        Add Target
      </Button>
    </div>
  );
}

function L4TargetDisplay({ reverseProxy }: Readonly<{ reverseProxy: ReverseProxy }>) {
  const target = reverseProxy.targets?.[0];
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );

  if (!target) {
    return <span className="text-xs text-nb-gray-400">No target</span>;
  }

  const isPeer = target.target_type === ReverseProxyTargetType.PEER;
  const peer = isPeer ? peers?.find((p) => p.id === target.target_id) : undefined;
  const resource = !isPeer
    ? resources?.find((r) => r.id === target.target_id)
    : undefined;

  const portLabel = target.host
    ? `${target.host}:${target.port}`
    : `:${target.port}`;

  return (
    <div className="flex items-center gap-2">
      {peer || resource ? (
        <DeviceCard device={peer} resource={resource} address={portLabel} />
      ) : (
        <span className="text-xs font-mono text-nb-gray-300 truncate">
          {portLabel}
        </span>
      )}
    </div>
  );
}
