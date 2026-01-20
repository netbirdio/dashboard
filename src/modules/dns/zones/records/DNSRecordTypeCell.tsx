import Badge from "@components/Badge";
import * as React from "react";
import { DNSRecord } from "@/interfaces/DNS";

type Props = {
  record: DNSRecord;
};

export const DNSRecordTypeCell = ({ record }: Props) => {
  return (
    <div className={"flex"}>
      <Badge
        variant={"gray"}
        className={"uppercase tracking-wider font-medium"}
      >
        {record.type}
      </Badge>
    </div>
  );
};
