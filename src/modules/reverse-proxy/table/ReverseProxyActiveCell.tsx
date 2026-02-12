import { ToggleSwitch } from "@components/ToggleSwitch";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxy } from "@/interfaces/ReverseProxy";

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyActiveCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { handleToggle } = useReverseProxies();

  return (
    <div className={"flex min-w-[0px]"}>
      <ToggleSwitch
        disabled={!permission?.services?.update}
        checked={reverseProxy.enabled}
        size={"small"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle(reverseProxy);
        }}
      />
    </div>
  );
}
