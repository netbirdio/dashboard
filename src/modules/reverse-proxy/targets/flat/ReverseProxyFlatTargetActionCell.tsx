import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import {
  MoreVertical,
  PowerIcon,
  Settings,
  SquarePenIcon,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { isL4Mode, ReverseProxyFlatTarget } from "@/interfaces/ReverseProxy";

type Props = {
  target: ReverseProxyFlatTarget;
};

export default function ReverseProxyFlatTargetActionCell({
  target,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const {
    openModal,
    openTargetModal,
    handleDeleteTarget,
    handleToggleTarget,
  } = useReverseProxies();
  const [open, setOpen] = useState(false);

  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
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
            data-proxy-edit-action={target.proxy.id}
            onClick={(e) => {
              e.stopPropagation();
              if (isL4Mode(target.proxy.mode)) {
                openModal({ proxy: target.proxy });
              } else {
                openTargetModal({ proxy: target.proxy, target: target });
              }
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
              setOpen(false);
              handleToggleTarget(target.proxy, target);
            }}
            disabled={!permission?.services?.update}
          >
            <div className={"flex gap-3 items-center"}>
              <PowerIcon size={14} className={"shrink-0"} />
              {target.enabled ? "Disable" : "Enable"}
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            data-proxy-settings-action={target.proxy.id}
            onClick={(e) => {
              e.stopPropagation();
              openModal({ proxy: target.proxy, initialTab: "settings" });
            }}
            disabled={!permission?.services?.update}
          >
            <div className={"flex gap-3 items-center pr-6"}>
              <Settings size={14} className={"shrink-0"} />
              Advanced Settings
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

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
