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
import { notify } from "@components/Notification";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { DeviceCert } from "@/interfaces/DeviceSecurity";
import type { Peer } from "@/interfaces/Peer";
import useFetchApi from "@utils/api";
import Link from "next/link";
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
  peerMap: Map<string, Peer>,
): ColumnDef<DeviceCert>[] {
  return [
    {
      id: "peer",
      header: ({ column }) => (
        <DataTableHeader column={column}>Peer</DataTableHeader>
      ),
      cell: ({ row }) => {
        const peer = peerMap.get(row.original.peer_id);
        if (peer) {
          return (
            <Link
              href={`/peer?id=${peer.id}`}
              className="group flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-medium text-nb-gray-100 group-hover:text-netbird transition-colors">
                {peer.name}
              </span>
              <span className="text-xs text-nb-gray-500">
                {peer.ip}
              </span>
            </Link>
          );
        }
        return (
          <span className="text-nb-gray-400 text-sm" title={row.original.peer_id}>
            {truncate(row.original.peer_id)}
          </span>
        );
      },
    },
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
  const { data: peers } = useFetchApi<Peer[]>("/peers");

  const peerMap = React.useMemo(() => {
    if (!peers) return new Map<string, Peer>();
    return new Map(peers.map((p) => [p.id ?? "", p]));
  }, [peers]);

  const { mutate } = useSWRConfig();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "not_after", desc: true }],
  );

  const handleRenew = useCallback(
    (id: string) => {
      notify({
        title: "Renewing certificate",
        description: "Device certificate was successfully renewed",
        promise: renewDevice(id),
        loadingMessage: "Renewing device certificate...",
      });
    },
    [renewDevice],
  );

  const columns = React.useMemo(
    () => buildColumns(handleRenew, peerMap),
    [handleRenew, peerMap],
  );

  const emptyState = (
    <NoResults
      title="No device certificates issued"
      description="Device certificates will appear here once devices enroll and are issued certificates."
      icon={<ShieldIcon size={20} />}
    />
  );

  return (
    <DataTable
      text="Devices"
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={devices}
      isLoading={devicesLoading}
      searchPlaceholder="Search by key or serial..."
      getStartedCard={emptyState}
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
