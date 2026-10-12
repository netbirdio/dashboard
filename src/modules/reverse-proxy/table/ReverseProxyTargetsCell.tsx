import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/Tooltip";
import { wrapIPv6 } from "@utils/ip";
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

  const isL4 = isL4Mode(reverseProxy.mode);
  const targets = reverseProxy?.targets ?? [];
  const targetsCount = targets.length;

  const addButton = (
    <Button
      size={"xs"}
      variant={"secondary"}
      onClick={(e) => {
        e.stopPropagation();
        openTargetModal({ proxy: reverseProxy });
      }}
      className={"!px-3"}
      disabled={isL4 || !permission?.services?.create}
    >
      <PlusCircle size={12} />
      Add
    </Button>
  );

  return (
    <div className={"flex gap-3"} data-targets-cell>
      {targetsCount > 0 && (
        <TooltipProvider>
          <Tooltip delayDuration={1}>
            <TooltipTrigger asChild={true}>
              <Badge
                variant={"gray"}
                useHover={true}
                className={"cursor-help"}
              >
                <Server size={14} />
                <div>
                  <span className={"font-medium text-xs"}>{targetsCount}</span>
                </div>
              </Badge>
            </TooltipTrigger>
            <TooltipContent className={"p-2 w-fit max-w-md"}>
              <div className={"flex flex-col gap-1 items-start w-fit"}>
                {targets.map((target, i) => {
                  const host = target.host ? wrapIPv6(target.host) : "";
                  const address = host
                    ? `${host}:${target.port}`
                    : `:${target.port}`;
                  return (
                    <ReverseProxyTargetDevice
                      key={`${target.target_id ?? "target"}-${i}`}
                      target={target}
                      address={address}
                      wrapperClassName={"h-auto w-fit"}
                      skeletonClassName={"h-[40px]"}
                    />
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {isL4 ? (
        <FullTooltip
          interactive={false}
          content={
            <span className={"text-xs text-nb-gray-100 max-w-[200px]"}>
              L4 services (TCP / UDP / TLS) only support a single target.
            </span>
          }
        >
          <span className={"inline-flex"}>{addButton}</span>
        </FullTooltip>
      ) : (
        addButton
      )}
    </div>
  );
}
