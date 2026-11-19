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
import { useTranslations } from "@/i18n/LocaleProvider";
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

const PeerRemoteJobsColumns: ColumnDef<Job>[] = [
  {
    accessorKey: "Type",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="common.type" />
    ),
    cell: ({ row }) => <JobTypeCell job={row.original} />,
  },
  {
    accessorKey: "CreatedAt",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="tables.created" />
    ),
    sortingFn: "datetime",
    cell: ({ row }) => (
      <LastTimeRow date={row.original.created_at} textId="tables.createdAt" />
    ),
  },
  {
    accessorKey: "Status",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="common.status" />
    ),
    cell: ({ row }) => <JobStatusCell job={row.original} />,
  },
  {
    accessorKey: "CompletedAt",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="tables.completed" />
    ),
    sortingFn: "datetime",
    cell: ({ row }) =>
      row.original.completed_at ? (
        <LastTimeRow
          date={row.original.completed_at}
          textId="tables.completedAt"
        />
      ) : (
        <EmptyRow />
      ),
  },
  {
    accessorKey: "Parameters",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="jobs.parameters" />
    ),
    cell: ({ row }) => (
      <JobParametersCell parameters={row.original.workload.parameters} />
    ),
  },
  {
    id: "ResultOrReason",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="jobs.output" />
    ),
    cell: ({ row }) => <JobOutputCell job={row.original} />,
  },
];

export default function PeerRemoteJobsTable({
  jobs,
  isLoading,
  headingTarget,
  peerID,
}: Props) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();

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
      text="Jobs"
      columns={PeerRemoteJobsColumns}
      keepStateInLocalStorage={false}
      data={jobs}
      searchPlaceholder={t("jobs.searchJobs")}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className="py-4"
          title="This peer has no remote jobs"
          description="Create a debug bundle or trigger other remote jobs to see them listed here."
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
