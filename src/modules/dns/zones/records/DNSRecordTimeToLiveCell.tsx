import { ClockIcon } from "lucide-react";
import * as React from "react";
import { DNSRecord } from "@/interfaces/DNS";
import { getTTLLabel } from "@/modules/dns/zones/DNSRecordModal";

type Props = {
  record: DNSRecord;
};

export const DNSRecordTimeToLiveCell = ({ record }: Props) => {
  return (
    <div
      className={
        "flex items-center whitespace-nowrap gap-2 text-nb-gray-300 hover:text-nb-gray-100 transition-all py-2 px-3 rounded-md"
      }
    >
      <ClockIcon size={14} />
      {getTTLLabel(record.ttl)}
    </div>
  );
};
