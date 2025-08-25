import Badge from "@/components/Badge";
import DataTableRefreshButton from "@/components/table/DataTableRefreshButton";
import { Job } from "@/interfaces/Job";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";


type Props = {
  jobs?: Job[];
  peerID: string;
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

const JobStatusCell = ({ status }: { status: Job["Status"] }) => {
  const label =
    status === "successed"
      ? "Succeeded"
      : status === "failed"
      ? "Failed"
      : "Pending";

  return (
    <Badge
      variant={
        status === "successed"
          ? "green"
          : status === "failed"
          ? "red"
          : "yellow"
      }
    >
      {label}
    </Badge>
  );
};

const PeerRemoteJobsColumns: ColumnDef<Job>[] = [
  {
    accessorKey: "Type",
    header: ({ column }) => <DataTableHeader column={column}>Type</DataTableHeader>,
    cell: ({ row }) => row.original.Type,
  },
  {
    accessorKey: "Status",
    header: ({ column }) => <DataTableHeader column={column}>Status</DataTableHeader>,
    cell: ({ row }) => <JobStatusCell status={row.original.Status} />,
  },
  {
    accessorKey: "CreatedAt",
    header: ({ column }) => <DataTableHeader column={column}>Created</DataTableHeader>,
    sortingFn: "datetime",
    cell: ({ row }) =>
      row.original.CreatedAt
        ? formatDistanceToNow(new Date(row.original.CreatedAt), {
            addSuffix: true,
          })
        : "-",
  },
  {
    accessorKey: "CompletedAt",
    header: ({ column }) => <DataTableHeader column={column}>Completed</DataTableHeader>,
    sortingFn: "datetime",
    cell: ({ row }) =>
      row.original.CompletedAt
        ? formatDistanceToNow(new Date(row.original.CompletedAt), {
            addSuffix: true,
          })
        : "-",
  },
  {
    accessorKey: "Parameters",
    header: ({ column }) => <DataTableHeader column={column}>Parameters</DataTableHeader>,
    cell: ({ row }) => <ParametersCell parameters={row.original.Parameters} />

  },
  {
    id: "ResultOrReason",
    header: ({ column }) =>  <DataTableHeader column={column}>Output</DataTableHeader>,
    cell: ({ row }) => {
      const job = row.original;
      if (job.Status === "successed" && job.Result) {
        return <span className="text-green-600">{job.Result}</span>;
      }
      if (job.Status === "failed" && job.FailedReason) {
        return <span className="text-red-600">{job.FailedReason}</span>;
      }
      return "-";
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
          icon={<ClipboardList size={20} className="fill-nb-gray-300" />}
        />
      }
      paginationPaddingClassName="px-0 pt-8"
    >
      {() => (
        <DataTableRefreshButton
          isDisabled={jobs?.length == 0}
          onClick={() => {
            mutate(`/peers/${peerID}/jobs`).then();
          }}
        />
      )}
    </DataTable>
  );
}
const ParametersCell = ({ parameters }: { parameters: any }) => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {Object.entries(parameters).map(([key, value]) => (
        <div key={key} className="text-sm">
          <span className="font-medium capitalize">{key}</span>:{" "}
          <span className="text-gray-700">
            {typeof value === "boolean"
              ? value
                ? "Yes"
                : "No"
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};
