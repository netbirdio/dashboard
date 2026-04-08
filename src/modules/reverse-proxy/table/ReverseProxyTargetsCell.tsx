import Badge from "@components/Badge";
import Button from "@components/Button";
import { PlusCircle, Server } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { isL4Mode, ReverseProxy } from "@/interfaces/ReverseProxy";
import { ReverseProxyTargetDevice } from "@/modules/reverse-proxy/targets/ReverseProxyTargetDevice";

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyTargetsCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openTargetModal } = useReverseProxies();

  if (isL4Mode(reverseProxy.mode)) {
    const target = reverseProxy?.targets?.[0];
    const address = target.host
      ? `${target.host}:${target.port}`
      : `:${target.port}`;

    return (
      <ReverseProxyTargetDevice
        target={target}
        address={address}
        wrapperClassName={"h-[48px]"}
        skeletonClassName={"h-[48px]"}
      />
    );
  }

  const targetsCount = reverseProxy?.targets?.length ?? 0;

  return (
    <div className={"flex gap-3"} data-targets-cell>
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
