import Button from "@components/Button";
import Card from "@components/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  ArrowRight,
  ChevronDown,
  LockKeyhole,
  PlusCircle,
  Server,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useCallback, useState } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxyFlatTarget, ServiceMode } from "@/interfaces/ReverseProxy";
import ReverseProxyArrowCell from "@/modules/reverse-proxy/table/ReverseProxyArrowCell";
import ReverseProxyAuthCell from "@/modules/reverse-proxy/table/ReverseProxyAuthCell";
import ReverseProxyClusterCell from "@/modules/reverse-proxy/table/ReverseProxyClusterCell";
import ReverseProxyDestinationCell from "@/modules/reverse-proxy/table/ReverseProxyDestinationCell";
import ReverseProxyNameCell from "@/modules/reverse-proxy/table/ReverseProxyNameCell";
import ReverseProxyFlatTargetActionCell from "@/modules/reverse-proxy/targets/flat/ReverseProxyFlatTargetActionCell";
import ReverseProxyTargetActiveCell from "@/modules/reverse-proxy/targets/ReverseProxyTargetActiveCell";
import { ReverseProxyTargetProvider } from "@/modules/reverse-proxy/targets/ReverseProxyTargetContext";
import { ReverseProxyTargetDevice } from "@/modules/reverse-proxy/targets/ReverseProxyTargetDevice";

const FlatTargetsTableColumns: ColumnDef<ReverseProxyFlatTarget>[] = [
  {
    id: "target_id",
    accessorKey: "target_id",
    filterFn: "exactMatch",
  },
  {
    id: "domain",
    accessorFn: (row) => row.proxy.domain,
    header: ({ column }) => (
      <DataTableHeader column={column}>URL</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => {
      const target = row.original;
      const path = target.path
        ? target.path.startsWith("/")
          ? target.path
          : `/${target.path}`
        : "";
      const fullUrl = `${target.proxy.domain}${path}`;
      const disabled = target.enabled === false;
      const isEnabled = target.proxy.enabled && target.enabled !== false;

      return (
        <div className={disabled ? "opacity-40" : ""}>
          <ReverseProxyNameCell
            domain={fullUrl}
            enabled={isEnabled}
            showChevron={false}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "arrow",
    header: "",
    cell: ({ row }) => (
      <ReverseProxyArrowCell disabled={row.original.enabled === false} />
    ),
  },
  {
    accessorKey: "host",
    header: ({ column }) => (
      <DataTableHeader column={column}>Destination</DataTableHeader>
    ),
    cell: ({ row }) => <ReverseProxyDestinationCell target={row.original} />,
  },
  {
    accessorKey: "enabled",
    header: ({ column }) => (
      <DataTableHeader column={column}>Active</DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyTargetProvider value={row.original.proxy}>
        <ReverseProxyTargetActiveCell target={row.original} />
      </ReverseProxyTargetProvider>
    ),
  },
  {
    accessorKey: "proxy_cluster",
    header: ({ column }) => (
      <DataTableHeader column={column}>Cluster</DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyClusterCell reverseProxy={row.original.proxy} />
    ),
  },
  {
    accessorKey: "target_type",
    header: ({ column }) => (
      <DataTableHeader column={column}>Resource</DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyTargetDevice target={row.original} showDescription />
    ),
  },
  {
    accessorKey: "auth",
    header: ({ column }) => (
      <DataTableHeader column={column}>Auth Methods</DataTableHeader>
    ),
    cell: ({ row }) => (
      <ReverseProxyAuthCell reverseProxy={row.original.proxy} />
    ),
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => (
      <ReverseProxyFlatTargetActionCell target={row.original} />
    ),
  },
  {
    id: "searchString",
    accessorFn: (row) => {
      return [row.proxy.domain, row.destination, row.host, row.port, row.path].join("");
    },
  },
];

type Props = {
  targets: ReverseProxyFlatTarget[];
  isLoading?: boolean;
  hideResourceColumn?: boolean;
  emptyTableTitle?: string;
  emptyTableDescription?: string;
};

export const ReverseProxyFlatTargetsTable = ({
  targets,
  isLoading,
  hideResourceColumn,
  emptyTableTitle,
  emptyTableDescription,
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "domain", desc: false },
  ]);
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const params = useSearchParams();
  const router = useRouter();
  const resourceId = params.get("target") ?? undefined;

  const removeResourceParam = useCallback(() => {
    if (!resourceId) return;
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("target");
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }, [resourceId, params, router]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      isLoading={isLoading}
      inset={false}
      minimal={true}
      showSearchAndFilters={true}
      tableClassName="mt-0"
      text="Service"
      sorting={sorting}
      setSorting={setSorting}
      columns={FlatTargetsTableColumns}
      data={targets}
      keepStateInLocalStorage={false}
      searchPlaceholder="Search by URL, destination, or target..."
      initialFilters={
        resourceId ? [{ id: "target_id", value: resourceId }] : undefined
      }
      initialSearch={resourceId}
      onFilterReset={removeResourceParam}
      columnVisibility={{
        searchString: false,
        target_id: false,
        target_type: !hideResourceColumn,
      }}
      paginationPaddingClassName="px-0 pt-8"
      getStartedCard={
        <NoResults
          className="py-4"
          title={emptyTableTitle}
          description={emptyTableDescription}
          icon={<ReverseProxyIcon size={20} className="fill-nb-gray-300" />}
        />
      }
      rightSide={() => (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant={"primary"}
              className={"ml-auto"}
              disabled={!permission?.services?.create}
            >
              <PlusCircle size={16} />
              Add Service
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-[200px]">
            <DropdownMenuItem
              onClick={() => openModal({ initialEndpointMode: ServiceMode.HTTP })}
            >
              <div className="flex gap-3 items-center">
                <Server size={14} className="shrink-0" />
                HTTP Service
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openModal({ initialEndpointMode: ServiceMode.TLS })}
            >
              <div className="flex gap-3 items-center">
                <LockKeyhole size={14} className="shrink-0" />
                TLS Passthrough
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openModal({ initialEndpointMode: ServiceMode.TCP })}
            >
              <div className="flex gap-3 items-center">
                <ArrowRight size={14} className="shrink-0" />
                TCP Service
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openModal({ initialEndpointMode: ServiceMode.UDP })}
            >
              <div className="flex gap-3 items-center">
                <ArrowRight size={14} className="shrink-0" />
                UDP Service
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    >
      {(table) => (
        <DataTableRowsPerPage
          table={table}
          disabled={!targets || targets.length === 0}
        />
      )}
    </DataTable>
  );
};
