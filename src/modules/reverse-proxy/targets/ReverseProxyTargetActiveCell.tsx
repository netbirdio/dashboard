import { ToggleSwitch } from "@components/ToggleSwitch";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
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
  const { permission } = usePermissions();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <ToggleSwitch
        checked={target.enabled}
        size={"small"}
        disabled={!permission?.services?.update}
        onCheckedChange={() => {
          handleToggleTarget(reverseProxy, target);
        }}
      />
    </div>
  );
}
