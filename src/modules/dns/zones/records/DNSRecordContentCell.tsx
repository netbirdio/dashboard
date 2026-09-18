import CopyToClipboardText from "@components/CopyToClipboardText";
import * as React from "react";
import { DNSRecord } from "@/interfaces/DNS";

type Props = {
  record: DNSRecord;
};

export const DNSRecordContentCell = ({ record }: Props) => {
  return (
    <div className="flex flex-col gap-0 text-nb-gray-300 font-light truncate font-mono">
      <CopyToClipboardText>
        <span className={"font-normal truncate text-[0.82rem]"}>
          {record.content}
        </span>
      </CopyToClipboardText>
    </div>
  );
};
