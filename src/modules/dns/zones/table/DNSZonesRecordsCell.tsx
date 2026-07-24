"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { GlobeIcon, PlusCircle } from "lucide-react";
import * as React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSZone } from "@/interfaces/DNS";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";
import { useTranslations } from "next-intl";

type Props = {
  zone: DNSZone;
};

export const DNSZonesRecordsCell = ({ zone }: Props) => {
  const { permission } = usePermissions();
  const { openRecordModal } = useDNSZones();
  const t = useTranslations("dns");

  const recordsCount = zone?.records?.length ?? 0;

  return (
    <div className={"flex gap-3"}>
      {recordsCount > 0 && (
        <Badge
          variant={"gray"}
          useHover={true}
          className={"cursor-pointer"}
          onClick={() => void 0}
          data-testid="dns-zone-records-count"
        >
          <GlobeIcon size={12} />
          <div>
            <span className={"font-medium text-xs"}>{recordsCount}</span>
          </div>
        </Badge>
      )}

      <Button
        size={"xs"}
        variant={"secondary"}
        className={"!px-3"}
        onClick={() => openRecordModal(zone)}
        disabled={!permission?.dns?.create}
        data-testid="add-dns-record"
      >
        <PlusCircle size={12} />
        {t("addRecordBtn")}
      </Button>
    </div>
  );
};
