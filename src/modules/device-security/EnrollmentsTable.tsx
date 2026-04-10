"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { notify } from "@components/Notification";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { CheckCircleIcon, ShieldAlertIcon, XCircleIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";
import { useSWRConfig } from "swr";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { DeviceEnrollment } from "@/interfaces/DeviceSecurity";

const STATUS_BADGE_VARIANT = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
} as const;

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
} as const;

function truncate(value: string, length = 12): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}...`;
}

function formatDate(iso: string): string {
  return dayjs(iso).format("MMM D, YYYY HH:mm");
}

function StatusBadge({
  status,
}: Readonly<{ status: DeviceEnrollment["status"] }>) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} size="xs">
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function ActionsCell({
  enrollment,
  onApprove,
  onReject,
}: Readonly<{
  enrollment: DeviceEnrollment;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}>) {
  if (enrollment.status !== "pending") {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="xs"
        onClick={() => onApprove(enrollment.id)}
      >
        <CheckCircleIcon size={14} />
        Approve
      </Button>
      <Button
        variant="danger"
        size="xs"
        onClick={() => onReject(enrollment.id)}
      >
        <XCircleIcon size={14} />
        Reject
      </Button>
    </div>
  );
}

function buildColumns(
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
): ColumnDef<DeviceEnrollment>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableHeader column={column}>ID</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span title={row.original.id}>{truncate(row.original.id)}</span>
      ),
    },
    {
      accessorKey: "peer_id",
      header: ({ column }) => (
        <DataTableHeader column={column}>Peer ID</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span title={row.original.peer_id}>
          {truncate(row.original.peer_id)}
        </span>
      ),
    },
    {
      accessorKey: "wg_public_key",
      header: ({ column }) => (
        <DataTableHeader column={column}>WG Public Key</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span title={row.original.wg_public_key}>
          {truncate(row.original.wg_public_key, 16)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "reason",
      accessorKey: "reason",
      header: ({ column }) => (
        <DataTableHeader column={column}>Reason</DataTableHeader>
      ),
      cell: ({ row }) => {
        const reason = row.original.reason;
        return (
          <span
            className={"text-nb-gray-400 text-sm"}
            title={reason}
          >
            {reason ? (
              <span className={"text-nb-gray-100"}>{reason}</span>
            ) : (
              <span className={"text-nb-gray-500"}>—</span>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => <span>{formatDate(row.original.created_at)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsCell
          enrollment={row.original}
          onApprove={onApprove}
          onReject={onReject}
        />
      ),
    },
  ];
}

export default function EnrollmentsTable() {
  const {
    enrollments,
    enrollmentsLoading,
    approveEnrollment,
    rejectEnrollment,
  } = useDeviceSecurity();
  const { mutate } = useSWRConfig();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "created_at", desc: true }],
  );

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await approveEnrollment(id);
      } catch {
        notify({
          title: "Failed to approve enrollment",
          description: "Please try again.",
        });
      }
    },
    [approveEnrollment],
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        await rejectEnrollment(id);
      } catch {
        notify({
          title: "Failed to reject enrollment",
          description: "Please try again.",
        });
      }
    },
    [rejectEnrollment],
  );

  const columns = React.useMemo(
    () => buildColumns(handleApprove, handleReject),
    [handleApprove, handleReject],
  );

  if (!enrollmentsLoading && (!enrollments || enrollments.length === 0)) {
    return (
      <NoResults
        title="No enrollment requests"
        description="There are no device enrollment requests at this time."
        icon={<ShieldAlertIcon size={20} />}
      />
    );
  }

  return (
    <DataTable
      text="Enrollments"
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={enrollments}
      isLoading={enrollmentsLoading}
      searchPlaceholder="Search by ID, peer, or key..."
    >
      {() => (
        <DataTableRefreshButton
          isDisabled={!enrollments || enrollments.length === 0}
          onClick={() => {
            mutate("/device-auth/enrollments");
          }}
        />
      )}
    </DataTable>
  );
}
