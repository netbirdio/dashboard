import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import React, { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { GroupedRoute, Route } from "@/interfaces/Route";
import RouteAccessControlGroups from "@/modules/routes/RouteAccessControlGroups";
import RouteActionCell from "@/modules/routes/RouteActionCell";
import RouteActiveCell from "@/modules/routes/RouteActiveCell";
import RouteDistributionGroupsCell from "@/modules/routes/RouteDistributionGroupsCell";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";
import RoutePeerCell from "@/modules/routes/RoutePeerCell";

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
    accessorKey: "description",
    sortingFn: "text",
  },
  {
    accessorKey: "domain_search",
    sortingFn: "text",
  },
  {
    id: "domains",
    accessorFn: (row) => {
      return row.domains?.map((name) => name).join(", ");
    },
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
    id: "access_control_groups",
    accessorFn: (r) => r?.access_control_groups?.length,
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>Access Control Groups</DataTableHeader>
      );
    },
    cell: ({ row }) => <RouteAccessControlGroups route={row.original} />,
  },
  {
    id: "group_names",
    accessorFn: (row) => {
      return row.group_names?.map((name) => name).join(", ");
    },
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <RouteActionCell route={row.original} />,
  },
];

export default function RouteTable({ row }: Props) {
  const { groups } = useGroups();

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

  const data = useMemo(() => {
    if (!row.routes) return [];
    // Get the group names for better search results
    return row.routes.map((route) => {
      const distributionGroupNames =
        route.groups?.map((id) => {
          return groups?.find((g) => g.id === id)?.name || "";
        }) || [];
      const peerGroupNames =
        route.peer_groups?.map((id) => {
          return groups?.find((g) => g.id === id)?.name || "";
        }) || [];
      const allGroupNames = [...distributionGroupNames, ...peerGroupNames];
      const domainString = route?.domains?.join(", ") || "";
      return {
        ...route,
        group_names: allGroupNames,
        domain_search: domainString,
      } as Route;
    });
  }, [row.routes, groups]);

  return (
    <>
      <DataTable
        tableClassName={"mt-0"}
        minimal={true}
        showSearchAndFilters={false}
        className={"bg-neutral-900/50 py-2"}
        inset={true}
        text={"Network Routes"}
        manualPagination={true}
        sorting={sorting}
        columnVisibility={{
          group_names: false,
          description: false,
          domains: false,
          domain_search: false,
        }}
        setSorting={setSorting}
        columns={RouteTableColumns}
        data={data}
      />
    </>
  );
}
