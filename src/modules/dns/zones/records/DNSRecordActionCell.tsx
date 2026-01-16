import Button from "@components/Button";
import { PenSquare, Trash2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSRecord } from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";
import { useDNSZone } from "@/modules/dns/zones/records/DNSRecordsTable";

type Props = {
  record: DNSRecord;
};

export const DNSRecordActionCell = ({ record }: Props) => {
  const { permission } = usePermissions();
  const { deleteRecord, openRecordModal } = useDNSZones();
  const zone = useDNSZone();

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => openRecordModal(zone, record)}
        disabled={!permission?.dns?.update}
      >
        <PenSquare size={16} />
        Edit
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={() => deleteRecord(zone, record)}
        disabled={!permission?.dns?.delete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
};
