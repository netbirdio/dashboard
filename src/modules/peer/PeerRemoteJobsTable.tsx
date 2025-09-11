import Badge from "@/components/Badge";
import DataTableRefreshButton from "@/components/table/DataTableRefreshButton";
import { Job } from "@/interfaces/Job";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ClipboardList, InfoIcon } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import EmptyRow from "../common-table-rows/EmptyRow";
import FullTooltip from "@/components/FullTooltip";
import JobStatusCell from "../users/table-cells/JobStatusCell";
import LastTimeRow from "../common-table-rows/LastTimeRow";
import { DataTableRowsPerPage } from "@/components/table/DataTableRowsPerPage";
import { RemoteJobDropdownButton } from "./RemoteJobDropdownButton";


type Props = {
  jobs?: Job[];
  peerID: string;
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};


const PeerRemoteJobsColumns: ColumnDef<Job>[] = [
  {
    accessorKey: "Type",
    header: ({ column }) => <DataTableHeader column={column}>Type</DataTableHeader>,
    cell: ({ row }) => row.original.workload.type,
  },
  {
    accessorKey: "Status",
    header: ({ column }) => <DataTableHeader column={column}>Status</DataTableHeader>,
    cell: ({ row }) => <JobStatusCell job={row.original} />,

  },
  {
    accessorKey: "CreatedAt",
    header: ({ column }) => <DataTableHeader column={column}>Created</DataTableHeader>,
    sortingFn: "datetime",
    cell: ({ row }) => <LastTimeRow date={row.original.created_at} text="Created at" />
  },
  {
    accessorKey: "CompletedAt",
    header: ({ column }) => <DataTableHeader column={column}>Completed</DataTableHeader>,
    sortingFn: "datetime",
    cell: ({ row }) => row.original.completed_at ? <LastTimeRow date={row.original.completed_at} text="completed at" /> : <EmptyRow />
  },
  {
    accessorKey: "Parameters",
    header: ({ column }) => <DataTableHeader column={column}>Parameters</DataTableHeader>,
    cell: ({ row }) => <ParametersCell parameters={row.original.workload.parameters} />

  },
  {
    id: "ResultOrReason",
    header: ({ column }) => <DataTableHeader column={column}>Output</DataTableHeader>,
    cell: ({ row }) => {
      const job = row.original;
      if (job.status === "succeeded" && job.workload.result) {
        return <ResultCell result={job.workload.result} />
      }
      if (job.status === "failed" && job.failed_reason) {
        return <span className="text-red-600">{job.failed_reason}</span>;
      }
      return <EmptyRow />;
    },
  },
];

export default function PeerRemoteJobsTable({
  jobs,
  isLoading,
  headingTarget,
  peerID,
}: Props) {
  const { mutate } = useSWRConfig();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "CreatedAt", desc: true },
  ]);

  return (
    <DataTable
      rightSide={() => (
        <div className={"gap-x-4 ml-auto flex"}>
          <RemoteJobDropdownButton />
        </div>)
      }
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
      searchPlaceholder="Search by type, status, or parameters..."
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
const ParametersCell = ({ parameters }: { parameters: any }) => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return <EmptyRow />;
  }

  const entries = Object.entries(parameters);

  return (
    <FullTooltip
      side="top"
      interactive
      delayDuration={250}
      skipDelayDuration={100}
      contentClassName="p-2"
      content={
        <div className="flex flex-col gap-1 text-sm">
          {entries.map(([key, value]) => (
            <div key={key}>
              <span className="font-medium capitalize">{key.replaceAll("_", " ")}</span>:{" "}
              <span className="text-gray-400">
                {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
              </span>
            </div>
          ))}
        </div>
      }
    >
      <Badge variant='gray' className="flex items-center gap-1 cursor-default">
        <InfoIcon size={12} />
        {entries.length} Parameters
      </Badge>
    </FullTooltip>
  );
};

const ResultCell = ({ result }: { result: any }) => {
  return (<div className="flex flex-col gap-1">
    {Object.entries(result).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="font-medium capitalize">{key.replaceAll("_", " ")}</span>:{" "}
        <span className="text-gray-400">
          {typeof value === "boolean" ? value ? "Yes" : "No" : String(value)}
        </span>
      </div>))}
  </div>);
};
