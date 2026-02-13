import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MoreVertical, Settings, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxyFlatTarget } from "@/interfaces/ReverseProxy";

type Props = {
  target: ReverseProxyFlatTarget;
};

export default function ReverseProxyFlatTargetActionCell({
  target,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openModal, openTargetModal, handleDeleteTarget } =
    useReverseProxies();

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              openTargetModal({ proxy: target.proxy, target: target });
            }}
            disabled={!permission?.services?.update}
          >
            <div className={"flex gap-3 items-center pr-8"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit Target
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              openModal({ proxy: target.proxy, initialTab: "settings" });
            }}
            disabled={!permission?.services?.update}
          >
            <div className={"flex gap-3 items-center"}>
              <Settings size={14} className={"shrink-0"} />
              Settings
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTarget(target.proxy, target);
            }}
            variant={"danger"}
            disabled={!permission?.services?.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
