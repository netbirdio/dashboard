import { BugIcon } from "lucide-react";
import * as React from "react";
import { Job } from "@/interfaces/Job";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  job: Job;
};
export const JobTypeCell = ({ job }: Props) => {
  if (job.workload.type === "bundle") {
    return (
      <div
        className={"flex items-center gap-2 whitespace-nowrap text-nb-gray-200"}
      >
        <BugIcon size={14} />
        <span>Debug Bundle</span>
      </div>
    );
  }

  return <EmptyRow />;
};
