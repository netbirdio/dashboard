import { BugIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Job } from "@/interfaces/Job";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

type Props = {
  job: Job;
};
export const JobTypeCell = ({ job }: Props) => {
  const t = useTranslations();
  if (job.workload.type === "bundle") {
    return (
      <div
        className={"flex items-center gap-2 whitespace-nowrap text-nb-gray-200"}
      >
        <BugIcon size={14} />
        <span>{t("jobs.debugBundle")}</span>
      </div>
    );
  }

  return <EmptyRow />;
};
