import Badge from "@components/Badge";
import Button from "@components/Button";
import { Settings, ShieldCheck, ShieldOff } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxy } from "@/interfaces/ReverseProxy";

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyAuthCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const auth = reverseProxy.auth;

  const enabledCount = [
    auth?.bearer_auth?.enabled,
    auth?.link_auth?.enabled,
    auth?.password_auth?.enabled,
    auth?.pin_auth?.enabled,
  ].filter(Boolean).length;

  return (
    <div
      className={"flex gap-3"}
      onClick={(e) => {
        e.stopPropagation();
        openModal({ proxy: reverseProxy, initialTab: "auth" });
      }}
    >
      {enabledCount > 0 ? (
        <Badge variant={"gray"} useHover={false} className={"cursor-pointer"}>
          <ShieldCheck size={12} className="text-green-400" />
          <div>
            <span className={"font-medium text-xs"}>Enabled</span>
          </div>
        </Badge>
      ) : (
        <Badge variant={"gray"}>
          <ShieldOff size={12} className="text-red-500" />
          <span className={"font-medium text-xs"}>None</span>
        </Badge>
      )}

      <Button
        size={"xs"}
        variant={"secondary"}
        onClick={(e) => {
          e.stopPropagation();
          openModal({ proxy: reverseProxy, initialTab: "auth" });
        }}
        className={"!px-3"}
        disabled={!permission?.services?.update}
      >
        <Settings size={12} />
        Configure
      </Button>
    </div>
  );
}
