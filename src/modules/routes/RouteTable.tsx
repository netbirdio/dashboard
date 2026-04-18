import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import React, { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { GroupedRoute, Route } from "@/interfaces/Route";
import RouteAccessControlGroups from "@/modules/routes/RouteAccessControlGroups";
import RouteActionCell from "@/modules/routes/RouteActionCell";
import RouteActiveCell from "@/modules/routes/RouteActiveCell";
import RouteAutoApplyCell from "@/modules/routes/RouteAutoApplyCell";
import RouteDistributionGroupsCell from "@/modules/routes/RouteDistributionGroupsCell";
import RouteMetricCell from "@/modules/routes/RouteMetricCell";
import RoutePeerCell from "@/modules/routes/RoutePeerCell";

type Props = {
  row: GroupedRoute;
};
function useRouteTableColumns(): ColumnDef<Route>[] {
  const { t } = useI18n();

  return [
    {
      accessorKey: "network_id",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
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
      accessorKey: "network",
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
        return <DataTableHeader column={column}>{t("networkRouting.metric")}</DataTableHeader>;
      },
      cell: ({ row }) => <RouteMetricCell metric={row.original.metric} />,
      sortingFn: "alphanumeric",
    },
    {
      id: "enabled",
      accessorKey: "enabled",
      sortingFn: "basic",
      header: ({ column }) => (
        <DataTableHeader column={column}>{t("table.active")}</DataTableHeader>
      ),
      cell: ({ row }) => <RouteActiveCell route={row.original} />,
    },
    {
      id: "groups",
      accessorFn: (r) => r.groups?.length,
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>
            {t("routeModal.distributionGroups")}
          </DataTableHeader>
        );
      },
      cell: ({ row }) => <RouteDistributionGroupsCell route={row.original} />,
    },
    {
      id: "access_control_groups",
      accessorFn: (r) => r?.access_control_groups?.length,
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>
            {t("routeModal.accessControlGroups")}
          </DataTableHeader>
        );
      },
      cell: ({ row }) => <RouteAccessControlGroups route={row.original} />,
    },
    {
      id: "skipAutoApply",
      accessorKey: "skip_auto_apply",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("routeModal.autoApplyRoute")}</DataTableHeader>;
      },
      cell: ({ row }) => <RouteAutoApplyCell route={row.original} />,
      sortingFn: "basic",
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
}

export default function RouteTable({ row }: Props) {
  const { t } = useI18n();
  const { groups } = useGroups();
  const columns = useRouteTableColumns();

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

  const hasAtLeastOneExitNode = useMemo(() => {
    return row.routes?.some((route) => route.network === "0.0.0.0/0");
  }, [row.routes]);

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
        className={"bg-nb-gray-960 py-2"}
        inset={true}
        text={t("networkRoutesPage.title")}
        manualPagination={true}
        sorting={sorting}
        columnVisibility={{
          group_names: false,
          description: false,
          domains: false,
          domain_search: false,
          network: false,
          skipAutoApply: !!hasAtLeastOneExitNode,
        }}
        setSorting={setSorting}
        columns={columns}
        data={data}
      />
    </>
  );
}
