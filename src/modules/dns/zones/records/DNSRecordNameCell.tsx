import CopyToClipboardText from "@components/CopyToClipboardText";
import * as React from "react";
import { DNSRecord } from "@/interfaces/DNS";

type Props = {
  record: DNSRecord;
};

export const DNSRecordNameCell = ({ record }: Props) => {
  return (
    <div className="flex flex-col gap-0 dark:text-neutral-300 text-neutral-500 font-light truncate">
      <CopyToClipboardText>
        <span className={"font-normal truncate"}>{record.name}</span>
      </CopyToClipboardText>
    </div>
  );
};
