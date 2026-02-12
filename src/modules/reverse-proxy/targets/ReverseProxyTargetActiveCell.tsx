import { ToggleSwitch } from "@components/ToggleSwitch";
import * as React from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxyTarget } from "@/interfaces/ReverseProxy";
import { useReverseProxyTarget } from "./ReverseProxyTargetContext";

type Props = {
  target: ReverseProxyTarget;
};

export default function ReverseProxyTargetActiveCell({
  target,
}: Readonly<Props>) {
  const reverseProxy = useReverseProxyTarget();
  const { handleToggleTarget } = useReverseProxies();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <ToggleSwitch
        checked={target.enabled !== false}
        size={"small"}
        onCheckedChange={() => {
          handleToggleTarget(reverseProxy, target);
        }}
      />
    </div>
  );
}
