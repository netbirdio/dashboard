import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxyFlatTarget } from "@/interfaces/ReverseProxy";
import ReverseProxyArrowCell from "@/modules/reverse-proxy/table/ReverseProxyArrowCell";
import ReverseProxyAccessControlCell from "@/modules/reverse-proxy/table/ReverseProxyAccessControlCell";
import ReverseProxyAuthCell from "@/modules/reverse-proxy/table/ReverseProxyAuthCell";
import ReverseProxyDestinationCell from "@/modules/reverse-proxy/table/ReverseProxyDestinationCell";
import ReverseProxyNameCell from "@/modules/reverse-proxy/table/ReverseProxyNameCell";
import ReverseProxyFlatTargetActionCell from "@/modules/reverse-proxy/targets/flat/ReverseProxyFlatTargetActionCell";
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
      const isEnabled = target.proxy.enabled && target.enabled;

      return (
        <div data-proxy-id={target.proxy.id}>
          <ReverseProxyNameCell
            domain={fullUrl}
            enabled={isEnabled}
            reverseProxy={row.original.proxy}
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
      <div data-proxy-id={row.original.proxy.id}>
        <ReverseProxyArrowCell disabled={row.original.enabled === false} />
      </div>
    ),
  },
  {
    accessorKey: "host",
    header: ({ column }) => (
      <DataTableHeader column={column}>Destination</DataTableHeader>
    ),
    cell: ({ row }) => (
      <div data-proxy-id={row.original.proxy.id}>
        <ReverseProxyDestinationCell target={row.original} />
      </div>
    ),
  },
  {
    id: "enabled",
    accessorFn: (row) => row.enabled,
  },
  {
    accessorKey: "target_type",
    header: ({ column }) => (
      <DataTableHeader column={column}>Resource</DataTableHeader>
    ),
    cell: ({ row }) => (
      <div data-proxy-id={row.original.proxy.id}>
        <ReverseProxyTargetDevice
          target={row.original}
          showDescription
          deviceClassName={"w-[160px]"}
        />
      </div>
    ),
  },
  {
    id: "auth_and_access",
    header: ({ column }) => (
      <DataTableHeader column={column}>Auth &amp; Access</DataTableHeader>
    ),
    cell: ({ row }) => (
      <div
        className={"flex items-center gap-2"}
        data-proxy-id={row.original.proxy.id}
      >
        <ReverseProxyAuthCell reverseProxy={row.original.proxy} />
        <ReverseProxyAccessControlCell reverseProxy={row.original.proxy} />
      </div>
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
      return [
        row.proxy.domain,
        row.destination,
        row.host,
        row.port,
        row.path,
      ].join("");
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

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Active", dotClass: "bg-green-500" },
      { value: false, label: "Inactive", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "enabled",
        label: "Status",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={statusOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, statusOptions),
      },
    ],
    [statusOptions],
  );

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
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder="Search by URL, destination, or target..."
      initialFilters={
        resourceId ? [{ id: "target_id", value: resourceId }] : undefined
      }
      initialSearch={resourceId}
      onFilterReset={removeResourceParam}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{
        searchString: false,
        target_id: false,
        enabled: false,
        target_type: !hideResourceColumn,
      }}
      rowClassName={(row) => (row.original.enabled ? "" : "opacity-50")}
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
        <Button
          variant={"primary"}
          className={"ml-auto mr-4"}
          onClick={() => openModal()}
          disabled={!permission?.services?.create}
        >
          <PlusCircle size={16} />
          Add
        </Button>
      )}
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={!targets || targets.length === 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
              removeResourceParam();
            }}
          />
        </>
      )}
    </DataTable>
  );
};
