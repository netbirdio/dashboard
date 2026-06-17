"use client";

import Button from "@components/Button";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { notify } from "@components/Notification";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp, ClipboardCopyIcon, PlusCircle, ShieldCheckIcon, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
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

function CertPEMViewer({ pem }: { pem: string }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pem);
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-nb-gray-400 hover:text-nb-gray-200 transition-colors w-fit"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Hide certificate" : "View certificate"}
      </button>
      {expanded && (
        <div className="relative mt-2">
          <pre className="text-xs font-mono text-nb-gray-300 bg-nb-gray-950 border border-nb-gray-900 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
            {pem}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy PEM"
            className="absolute top-2 right-2 text-nb-gray-400 hover:text-nb-gray-100 transition-colors"
          >
            <ClipboardCopyIcon size={14} />
          </button>
        </div>
      )}
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
        <div className="flex flex-col gap-1">
          <span className="font-medium">{row.original.name}</span>
          {row.original.pem && (
            <CertPEMViewer pem={row.original.pem} />
          )}
        </div>
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

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function TrustedCAsTable({ headingTarget }: Readonly<Props>) {
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

  const emptyState = (
    <NoResults
      title="No trusted CAs added."
      description="Add a trusted Certificate Authority to enable device certificate authentication."
      icon={<ShieldCheckIcon size={20} />}
    >
      <div className={"mt-6"}>{addButton}</div>
    </NoResults>
  );

  return (
    <DataTable
      text="Trusted CAs"
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={trustedCAs ?? []}
      isLoading={trustedCAsLoading}
      searchPlaceholder="Search by name..."
      headingTarget={headingTarget}
      getStartedCard={emptyState}
      rightSide={() =>
        trustedCAs && trustedCAs.length > 0 ? addButton : null
      }
    />
  );
}
