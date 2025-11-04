import { cn } from "@utils/helpers";
import React from "react";
import { Job } from "@/interfaces/Job";

type Props = {
  job: Job;
};

export default function JobStatusCell({ job }: Readonly<Props>) {
  const status = job.status;

  return (
    <div
      className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
      data-cy={"job-status-cell"}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status == "pending" && "bg-yellow-400",
          status == "failed" && "bg-red-500",
          status == "succeeded" && "bg-green-500",
        )}
      ></span>
      {status == "pending" && "Pending"}
      {status == "failed" && "Failed"}
      {status == "succeeded" && "Completed"}
    </div>
  );
}
