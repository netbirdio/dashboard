import { ToggleSwitch } from "@components/ToggleSwitch";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSZone } from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";

type Props = {
  zone: DNSZone;
};

export const DNSZonesActiveCell = ({ zone }: Props) => {
  const { permission } = usePermissions();
  const { updateZone } = useDNSZones();

  return (
    <div className={"flex min-w-[0px]"}>
      <ToggleSwitch
        disabled={!permission?.dns?.update}
        checked={zone.enabled}
        size={"small"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateZone({
            ...zone,
            enabled: !zone.enabled,
          });
        }}
      />
    </div>
  );
};
