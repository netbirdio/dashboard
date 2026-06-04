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
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import * as React from "react";
import { useMemo, useState } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkRouter } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { NetworkRoutingPeerName } from "@/modules/networks/routing-peers/NetworkRoutingPeerName";
import { RoutingPeersActionCell } from "@/modules/networks/routing-peers/RoutingPeersActionCell";
import { RoutingPeersMasqueradeCell } from "@/modules/networks/routing-peers/RoutingPeersMasqueradeCell";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";

type Props = {
  routers?: NetworkRouter[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

const NetworkRouterColumns: ColumnDef<NetworkRouter>[] = [
  {
    id: "name",
    accessorKey: "id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Peer</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <NetworkRoutingPeerName router={row.original} />,
  },
  {
    id: "enabled",
    accessorKey: "enabled",
  },
  {
    id: "metric",
    accessorKey: "metric",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Metric</DataTableHeader>;
    },
    cell: ({ row }) => (
      <RouteMetricCell metric={row.original.metric} useHoverStyle={false} />
    ),
  },
  {
    id: "masquerade",
    accessorKey: "masquerade",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Masquerade</DataTableHeader>;
    },
    cell: ({ row }) => <RoutingPeersMasqueradeCell router={row.original} />,
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return <RoutingPeersActionCell router={row.original} />;
    },
  },
  {
    id: "search",
    accessorKey: "search",
    header: "",
    filterFn: "fuzzy",
  },
];

export default function NetworkRoutingPeersTable({
  routers,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openAddRoutingPeerModal, network } = useNetworksContext();

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "metric",
      desc: false,
    },
  ]);

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
      wrapperProps={{ className: "mt-6 pb-2 w-full" }}
      headingTarget={headingTarget}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      text={"Routing Peers"}
      columns={NetworkRouterColumns}
      keepStateInLocalStorage={false}
      initialPageSize={25}
      showResetFilterButton={false}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      data={routers}
      searchPlaceholder={"Search by peer name, group name..."}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={"This network has no routing peers"}
          description={
            "Add routing peers to this network to access resources inside this network."
          }
          icon={<PeerIcon size={18} className={"fill-nb-gray-400"} />}
        />
      }
      columnVisibility={{ search: false, enabled: false }}
      rowClassName={(row) => (row.original.enabled ? "" : "opacity-50")}
      paginationPaddingClassName={"px-0 pt-8"}
      rightSide={() => (
        <Button
          variant={"primary"}
          className={"ml-auto mr-4"}
          onClick={() => network && openAddRoutingPeerModal(network)}
          disabled={!permission.networks.update}
        >
          <IconCirclePlus size={16} />
          Add
        </Button>
      )}
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={!routers || routers?.length == 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
