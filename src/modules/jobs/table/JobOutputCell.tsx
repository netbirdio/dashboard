import Badge from "@components/Badge";
import CopyToClipboardText from "@components/CopyToClipboardText";
import FullTooltip from "@components/FullTooltip";
import { Input } from "@components/Input";
import * as React from "react";
import { Job } from "@/interfaces/Job";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  job: Job;
};

export const JobOutputCell = ({ job }: Props) => {
  if (job.status === "succeeded" && job.workload.result) {
    return (
      <div className="flex flex-col gap-1 items-start justify-center pb-1">
        {Object.entries(job.workload.result).map(([key, value]) => (
          <div key={key} className="text-sm max-w-[200px]">
            <span className="font-normal capitalize text-nb-gray-300 text-xs">
              {key.replaceAll("_", " ")}
            </span>
            <br />
            <span className="text-nb-gray-200 truncate">
              <CopyToClipboardText
                message={"Upload key has been copied to your clipboard"}
                alwaysShowIcon={true}
              >
                <span className={"font-mono truncate"}>
                  {typeof value === "boolean"
                    ? value
                      ? "Yes"
                      : "No"
                    : String(value)}
                </span>
              </CopyToClipboardText>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (job.status === "failed" && job.failed_reason) {
    return (
      <div className={"flex"}>
        <FullTooltip
          content={
            <div className={"max-w-xs text-xs"}>{job.failed_reason}</div>
          }
        >
          <Badge variant={"red"} className={"px-3 max-w-[200px]"}>
            <div className={"truncate"}>{job.failed_reason}</div>
          </Badge>
        </FullTooltip>
      </div>
    );
  }

  return <EmptyRow />;
};
