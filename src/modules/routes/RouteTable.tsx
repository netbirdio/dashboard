import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import React, { useState } from "react";
import { GroupedRoute, Route } from "@/interfaces/Route";
import RouteActionCell from "@/modules/routes/RouteActionCell";
import RouteActiveCell from "@/modules/routes/RouteActiveCell";
import RouteDistributionGroupsCell from "@/modules/routes/RouteDistributionGroupsCell";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";
import RoutePeerCell from "@/modules/routes/RoutePeerCell";
import RouteUpdateModal from "@/modules/routes/RouteUpdateModal";

type Props = {
  row: GroupedRoute;
};
export const RouteTableColumns: ColumnDef<Route>[] = [
  {
    accessorKey: "network_id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <RoutePeerCell route={row.original} />,
  },
  {
    accessorKey: "metric",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Metric</DataTableHeader>;
    },
    cell: ({ row }) => <RouteMetricCell metric={row.original.metric} />,
    sortingFn: "alphanumeric",
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    sortingFn: "basic",
    header: ({ column }) => (
      <DataTableHeader column={column}>Active</DataTableHeader>
    ),
    cell: ({ row }) => <RouteActiveCell route={row.original} />,
  },

  {
    id: "groups",
    accessorFn: (r) => r.groups?.length,
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>Distribution Groups</DataTableHeader>
      );
    },
    cell: ({ row }) => <RouteDistributionGroupsCell route={row.original} />,
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <RouteActionCell route={row.original} />,
  },
];

export default function RouteTable({ row }: Props) {
  // Default sorting state of the table
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "network_id",
      desc: true,
    },
    {
      id: "metric",
      desc: true,
    },
  ]);

  const [editModal, setEditModal] = useState(false);
  const [currentRow, setCurrentRow] = useState<Route>();
  const [currentCellClicked, setCurrentCellClicked] = useState("");

  return (
    <>
      {editModal && currentRow && (
        <RouteUpdateModal
          route={currentRow}
          open={editModal}
          onOpenChange={setEditModal}
          cell={currentCellClicked}
        />
      )}
      <DataTable
        tableClassName={"mt-0"}
        minimal={true}
        className={"bg-neutral-900/50 py-2"}
        inset={true}
        text={"Network Routes"}
        manualPagination={true}
        sorting={sorting}
        onRowClick={(row, cell) => {
          setCurrentRow(row.original);
          setEditModal(true);
          setCurrentCellClicked(cell);
        }}
        setSorting={setSorting}
        columns={RouteTableColumns}
        data={row.routes}
      />
    </>
  );
}
