"use client";

import Button from "@components/Button";
import { PenSquare, Trash2 } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
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
  const { t } = useI18n();

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => openRecordModal(zone, record)}
        disabled={!permission?.dns?.update}
      >
        <PenSquare size={16} />
        {t("actions.edit")}
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={() => deleteRecord(zone, record)}
        disabled={!permission?.dns?.delete}
      >
        <Trash2 size={16} />
        {t("actions.delete")}
      </Button>
    </div>
  );
};
