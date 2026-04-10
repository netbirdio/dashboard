"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { notify } from "@components/Notification";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { PlusCircle, ShieldCheckIcon, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback, useMemo } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TrustedCA } from "@/interfaces/DeviceSecurity";
import AddTrustedCAModal from "@/modules/device-security/AddTrustedCAModal";

function formatDate(iso: string): string {
  return dayjs(iso).format("MMM D, YYYY HH:mm");
}

type DeleteCellProps = {
  ca: TrustedCA;
  onDelete: (id: string) => void;
};

function DeleteCell({ ca, onDelete }: Readonly<DeleteCellProps>) {
  return (
    <div className="flex justify-end pr-4">
      <Button
        variant="danger-outline"
        size="sm"
        onClick={() => onDelete(ca.id)}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

function buildColumns(
  onDelete: (id: string) => void,
): ColumnDef<TrustedCA>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableHeader column={column}>Created</DataTableHeader>
      ),
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span className="text-nb-gray-400">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DeleteCell ca={row.original} onDelete={onDelete} />
      ),
    },
  ];
}

export default function TrustedCAsTable() {
  const { trustedCAs, trustedCAsLoading, deleteTrustedCA } = useDeviceSecurity();
  const { confirm } = useDialog();
  const path = usePathname();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "created_at", desc: true }],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ca = trustedCAs?.find((c) => c.id === id);
      const label = ca?.name ?? id;

      const choice = await confirm({
        title: `Delete '${label}'?`,
        description:
          "Are you sure you want to delete this trusted CA? Devices authenticated with this CA may lose access.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });

      if (!choice) return;

      notify({
        title: label,
        description: "Trusted CA was successfully deleted",
        promise: deleteTrustedCA(id),
        loadingMessage: "Deleting trusted CA...",
      });
    },
    [trustedCAs, confirm, deleteTrustedCA],
  );

  const columns = useMemo(() => buildColumns(handleDelete), [handleDelete]);

  const addButton = (
    <AddTrustedCAModal>
      <Button variant="primary" size="sm">
        <PlusCircle size={16} />
        Add CA
      </Button>
    </AddTrustedCAModal>
  );

  if (!trustedCAsLoading && (!trustedCAs || trustedCAs.length === 0)) {
    return (
      <div>
        <div className="flex justify-end mb-4">{addButton}</div>
        <NoResults
          title="No trusted CAs added."
          description="Add a trusted Certificate Authority to enable device certificate authentication."
          icon={<ShieldCheckIcon size={20} />}
        />
      </div>
    );
  }

  return (
    <DataTable
      text="Trusted CAs"
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={trustedCAs ?? []}
      isLoading={trustedCAsLoading}
      searchPlaceholder="Search by name..."
    >
      {() => addButton}
    </DataTable>
  );
}
