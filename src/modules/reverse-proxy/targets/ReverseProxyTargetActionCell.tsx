import Button from "@components/Button";
import { PenSquare, Trash2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxyTarget } from "@/interfaces/ReverseProxy";
import { useReverseProxyTarget } from "./ReverseProxyTargetContext";

type Props = {
  target: ReverseProxyTarget;
};

export const ReverseProxyTargetActionCell = ({ target }: Props) => {
  const reverseProxy = useReverseProxyTarget();
  const { permission } = usePermissions();
  const { openTargetModal, handleDeleteTarget } = useReverseProxies();

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"default-outline"}
        size={"sm"}
        disabled={!permission?.services?.update}
        onClick={(e) => {
          e.stopPropagation();
          openTargetModal({ proxy: reverseProxy, target: target });
        }}
      >
        <PenSquare size={16} />
        Edit
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        disabled={!permission?.services?.delete}
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteTarget(reverseProxy, target);
        }}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
};
