import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ClipboardList } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import DataTableRefreshButton from "@/components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@/components/table/DataTableRowsPerPage";
import { useI18n } from "@/i18n/I18nProvider";
import { Job } from "@/interfaces/Job";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import { JobOutputCell } from "@/modules/jobs/table/JobOutputCell";
import { JobParametersCell } from "@/modules/jobs/table/JobParametersCell";
import JobStatusCell from "@/modules/jobs/table/JobStatusCell";
import { JobTypeCell } from "@/modules/jobs/table/JobTypeCell";
import { RemoteJobDropdownButton } from "@/modules/peer/RemoteJobDropdownButton";

type Props = {
  jobs?: Job[];
  peerID: string;
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

function usePeerRemoteJobsColumns(): ColumnDef<Job>[] {
  const { t } = useI18n();

  return [
    {
      accessorKey: "Type",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("jobs.type")}</DataTableHeader>
      ),
      cell: ({ row }) => <JobTypeCell job={row.original} />,
    },
    {
      accessorKey: "CreatedAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("jobs.created")}</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <LastTimeRow date={row.original.created_at} text={t("jobs.createdAt")} />
      ),
    },
    {
      accessorKey: "Status",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("table.status")}</DataTableHeader>
      ),
      cell: ({ row }) => <JobStatusCell job={row.original} />,
    },
    {
      accessorKey: "CompletedAt",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("jobs.completed")}</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) =>
        row.original.completed_at ? (
          <LastTimeRow
            date={row.original.completed_at}
            text={t("jobs.completedAt")}
          />
        ) : (
          <EmptyRow />
        ),
    },
    {
      accessorKey: "Parameters",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("jobs.parameters")}</DataTableHeader>
      ),
      cell: ({ row }) => (
        <JobParametersCell parameters={row.original.workload.parameters} />
      ),
    },
    {
      id: "ResultOrReason",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("jobs.output")}</DataTableHeader>
      ),
      cell: ({ row }) => <JobOutputCell job={row.original} />,
    },
  ];
}

export default function PeerRemoteJobsTable({
  jobs,
  isLoading,
  headingTarget,
  peerID,
}: Props) {
  const { mutate } = useSWRConfig();
  const { t } = useI18n();
  const columns = usePeerRemoteJobsColumns();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "CreatedAt", desc: true },
  ]);

  return (
    <DataTable
      rightSide={() => (
        <div className={"gap-x-4 ml-auto flex"}>
          <RemoteJobDropdownButton />
        </div>
      )}
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      headingTarget={headingTarget}
      useRowId={true}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName="mt-0"
      text={t("jobs.title")}
      columns={columns}
      keepStateInLocalStorage={false}
      data={jobs}
      searchPlaceholder={t("jobs.searchPlaceholder")}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className="py-4"
          title={t("jobs.emptyTitle")}
          description={t("jobs.emptyDescription")}
          icon={<ClipboardList size={20} className="text-nb-gray-300" />}
        />
      }
      paginationPaddingClassName="px-0 pt-8"
    >
      {(table) => (
        <>
          <DataTableRowsPerPage table={table} disabled={jobs?.length == 0} />
          <DataTableRefreshButton
            isDisabled={jobs?.length == 0}
            onClick={() => {
              mutate(`/peers/${peerID}/jobs`).then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
