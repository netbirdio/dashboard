"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { RefreshCwIcon, ShieldIcon, ShieldOffIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback } from "react";
import { useSWRConfig } from "swr";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { DeviceCert } from "@/interfaces/DeviceSecurity";
import RevokeDeviceModal from "./RevokeDeviceModal";

function truncate(value: string, length = 16): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}...`;
}

function formatDate(iso: string): string {
  return dayjs(iso).format("MMM D, YYYY HH:mm");
}

function isExpired(notAfter: string): boolean {
  return dayjs(notAfter).isBefore(dayjs());
}

function StatusBadge({ cert }: Readonly<{ cert: DeviceCert }>) {
  if (cert.revoked) {
    return (
      <Badge variant="red" size="xs">
        Revoked
      </Badge>
    );
  }
  if (isExpired(cert.not_after)) {
    return (
      <Badge variant="yellow" size="xs">
        Expired
      </Badge>
    );
  }
  return (
    <Badge variant="green" size="xs">
      Active
    </Badge>
  );
}

type ActionsCellProps = {
  cert: DeviceCert;
  onRenew: (id: string) => void;
};

function ActionsCell({ cert, onRenew }: Readonly<ActionsCellProps>) {
  if (cert.revoked) {
    return null;
  }

  return (
    <div className="flex gap-2 justify-end pr-4">
      <Button
        variant="secondary"
        size="xs"
        onClick={() => onRenew(cert.id)}
      >
        <RefreshCwIcon size={14} />
        Renew
      </Button>
      <RevokeDeviceModal device={cert}>
        <Button variant="danger-outline" size="xs">
          <ShieldOffIcon size={14} />
          Revoke
        </Button>
      </RevokeDeviceModal>
    </div>
  );
}

function buildColumns(
  onRenew: (id: string) => void,
): ColumnDef<DeviceCert>[] {
  return [
    {
      accessorKey: "wg_public_key",
      header: ({ column }) => (
        <DataTableHeader column={column}>WG Public Key</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span
          className="font-mono"
          title={row.original.wg_public_key}
        >
          {truncate(row.original.wg_public_key)}
        </span>
      ),
    },
    {
      accessorKey: "serial",
      header: ({ column }) => (
        <DataTableHeader column={column}>Serial</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="font-mono" title={row.original.serial}>
          {truncate(row.original.serial)}
        </span>
      ),
    },
    {
      accessorKey: "not_before",
      header: ({ column }) => (
        <DataTableHeader column={column}>Valid From</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span>{formatDate(row.original.not_before)}</span>
      ),
    },
    {
      accessorKey: "not_after",
      header: ({ column }) => (
        <DataTableHeader column={column}>Expires</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span>{formatDate(row.original.not_after)}</span>
      ),
    },
    {
      accessorKey: "revoked",
      header: ({ column }) => (
        <DataTableHeader column={column}>Status</DataTableHeader>
      ),
      cell: ({ row }) => <StatusBadge cert={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsCell cert={row.original} onRenew={onRenew} />
      ),
    },
  ];
}

export default function DevicesTable() {
  const { devices, devicesLoading, renewDevice } = useDeviceSecurity();
  const { mutate } = useSWRConfig();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "not_after", desc: true }],
  );

  const handleRenew = useCallback(
    async (id: string) => {
      await renewDevice(id);
    },
    [renewDevice],
  );

  const columns = React.useMemo(
    () => buildColumns(handleRenew),
    [handleRenew],
  );

  if (!devicesLoading && (!devices || devices.length === 0)) {
    return (
      <NoResults
        title="No device certificates issued"
        description="No device certificates issued."
        icon={<ShieldIcon size={20} />}
      />
    );
  }

  return (
    <DataTable
      text="Devices"
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={devices}
      isLoading={devicesLoading}
      searchPlaceholder="Search by key or serial..."
    >
      {() => (
        <DataTableRefreshButton
          isDisabled={!devices || devices.length === 0}
          onClick={() => {
            mutate("/device-auth/devices");
          }}
        />
      )}
    </DataTable>
  );
}
