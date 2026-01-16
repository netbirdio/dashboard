import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MoreVertical, SquarePenIcon, Trash2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSZone } from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";

type Props = {
  zone: DNSZone;
};

export const DNSZonesActionCell = ({ zone }: Props) => {
  const { permission } = usePermissions();
  const { openZoneModal, deleteZone } = useDNSZones();

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
          <DropdownMenuItem onClick={() => openZoneModal(zone)}>
            <div className={"flex gap-3 items-center"}>
              <SquarePenIcon size={14} className={"shrink-0"} />
              Edit
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => deleteZone(zone)}
            variant={"danger"}
            disabled={!permission?.dns?.delete}
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
};
