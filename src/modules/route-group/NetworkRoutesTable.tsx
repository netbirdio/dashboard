import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import Card from "@components/Card";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cloneDeep } from "lodash";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import GroupRouteProvider from "@/contexts/GroupRouteProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { GroupedRoute, Route } from "@/interfaces/Route";
import { AddExitNodeButton } from "@/modules/exit-node/AddExitNodeButton";
import GroupedRouteActionCell from "@/modules/route-group/GroupedRouteActionCell";
import GroupedRouteHighAvailabilityCell from "@/modules/route-group/GroupedRouteHighAvailabilityCell";
import GroupedRouteNameCell from "@/modules/route-group/GroupedRouteNameCell";
import GroupedRouteNetworkRangeCell from "@/modules/route-group/GroupedRouteNetworkRangeCell";
import GroupedRouteTypeCell from "@/modules/route-group/GroupedRouteTypeCell";
import { RouteAddRoutingPeerProvider } from "@/modules/routes/RouteAddRoutingPeerProvider";
import RouteModal from "@/modules/routes/RouteModal";
import RouteTable from "@/modules/routes/RouteTable";

function useGroupedRouteTableColumns(): ColumnDef<GroupedRoute>[] {
  const { t } = useI18n();

  return [
    {
      accessorKey: "network_id",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <GroupedRouteNameCell groupedRoute={row.original} />,
    },
    {
      accessorKey: "description",
      sortingFn: "text",
    },
    {
      accessorKey: "description_search",
      sortingFn: "text",
    },
    {
      accessorKey: "domain_search",
      sortingFn: "text",
    },
    {
      id: "enabled",
      accessorKey: "enabled",
      sortingFn: "basic",
    },
    {
      id: "group_names",
      accessorFn: (row) => {
        return row.group_names?.map((name) => name).join(", ");
      },
    },
    {
      accessorKey: "routes_search",
    },
    {
      id: "domains",
      accessorFn: (row) => {
        return row.domains?.map((name) => name).join(", ");
      },
    },
    {
      accessorKey: "network",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("networkDetails.network")}</DataTableHeader>;
      },
      cell: ({ row }) => (
        <GroupedRouteNetworkRangeCell
          network={row.original.network}
          domains={row.original?.domains}
        />
      ),
    },
    {
      id: "type",
      accessorFn: (row) => row.is_using_route_groups,
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("networkDetails.type")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <GroupedRouteTypeCell groupedRoute={row.original} />,
    },

    {
      accessorKey: "high_availability_count",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>
            {t("networkDetails.highAvailability")}
          </DataTableHeader>
        );
      },
      cell: ({ row }) => (
        <GroupedRouteHighAvailabilityCell groupedRoute={row.original} />
      ),
    },

    {
      accessorKey: "id",
      header: "",
      cell: ({ row }) => <GroupedRouteActionCell groupedRoute={row.original} />,
    },
  ];
}

type Props = {
  isLoading: boolean;
  groupedRoutes?: GroupedRoute[];
  routes?: Route[];
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
  distributionGroups?: Group[];
};

export default function NetworkRoutesTable({
  isLoading,
  groupedRoutes,
  routes,
  headingTarget,
  isGroupPage = false,
  distributionGroups,
}: Props) {
  const { t } = useI18n();
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const columns = useGroupedRouteTableColumns();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "network_id",
        desc: true,
      },
      {
        id: "enabled",
        desc: true,
      },
      {
        id: "network",
        desc: true,
      },
    ],
    !isGroupPage,
  );

  const [routeModal, setRouteModal] = useState(false);

  return (
    <RouteAddRoutingPeerProvider>
      <RouteModal
        open={routeModal}
        setOpen={setRouteModal}
        distributionGroups={distributionGroups}
      />
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={t("networkRoutesPage.title")}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={groupedRoutes}
        wrapperComponent={isGroupPage ? Card : undefined}
        wrapperProps={isGroupPage ? { className: "mt-6 w-full" } : undefined}
        paginationPaddingClassName={isGroupPage ? "px-0 pt-8" : undefined}
        tableClassName={isGroupPage ? "mt-0 mb-2" : undefined}
        inset={false}
        minimal={isGroupPage}
        keepStateInLocalStorage={!isGroupPage}
        searchPlaceholder={t("routeTable.searchPlaceholder")}
        columnVisibility={{
          enabled: false,
          description: false,
          description_search: false,
          group_names: false,
          domains: false,
          domain_search: false,
          routes_search: false,
        }}
        renderExpandedRow={(row) => {
          const data = cloneDeep(row);
          return (
            <GroupRouteProvider groupedRoute={data}>
              <RouteTable row={data} />
            </GroupRouteProvider>
          );
        }}
        getStartedCard={
          isGroupPage ? (
            <NoResults
              icon={
                <NetworkRoutesIcon className={"fill-nb-gray-200"} size={20} />
              }
              className={"py-4"}
              title={t("routeTable.emptyGroupTitle")}
              description={t("routeTable.emptyGroupDescription")}
            >
              <div className={"gap-x-4 flex items-center justify-center mt-4"}>
                <AddExitNodeButton distributionGroups={distributionGroups} />
                <Button
                  variant={"primary"}
                  className={""}
                  onClick={() => setRouteModal(true)}
                  disabled={!permission.routes.create}
                >
                  <PlusCircle size={16} />
                  {t("routeActions.addRoute")}
                </Button>
              </div>
            </NoResults>
          ) : (
            <GetStartedTest
              icon={
                <SquareIcon
                  icon={
                    <NetworkRoutesIcon
                      className={"fill-nb-gray-200"}
                      size={20}
                    />
                  }
                  color={"gray"}
                  size={"large"}
                />
              }
              title={t("routeTable.createTitle")}
              description={
                t("routeTable.emptyTitleDescription")
              }
              button={
                <div className={"gap-x-4 flex items-center justify-center"}>
                  <AddExitNodeButton distributionGroups={distributionGroups} />
                  <Button
                    variant={"primary"}
                    className={""}
                    onClick={() => setRouteModal(true)}
                    disabled={!permission.routes.create}
                  >
                    <PlusCircle size={16} />
                    {t("routeActions.addRoute")}
                  </Button>
                </div>
              }
              learnMore={
                <>
                  {t("common.learnMorePrefix")}{" "}
                  <InlineLink
                    href={
                      "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                    }
                    target={"_blank"}
                  >
                    {t("networkRoutesPage.title")}
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          )
        }
        rightSide={() => (
          <>
            {routes && routes?.length > 0 && (
              <div className={"gap-x-4 ml-auto flex"}>
                <AddExitNodeButton distributionGroups={distributionGroups} />
                <Button
                  variant={"primary"}
                  className={""}
                  onClick={() => setRouteModal(true)}
                  disabled={!permission.routes.create}
                >
                  <PlusCircle size={16} />
                  {t("routeActions.addRoute")}
                </Button>
              </div>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <ButtonGroup disabled={routes?.length == 0}>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(true);
                }}
                disabled={routes?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() == true
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("filters.enabled")}
              </ButtonGroup.Button>
              <ButtonGroup.Button
                onClick={() => {
                  table.setPageIndex(0);
                  table.getColumn("enabled")?.setFilterValue(undefined);
                }}
                disabled={routes?.length == 0}
                variant={
                  table.getColumn("enabled")?.getFilterValue() == undefined
                    ? "tertiary"
                    : "secondary"
                }
              >
                {t("filters.all")}
              </ButtonGroup.Button>
            </ButtonGroup>
            <DataTableRowsPerPage
              table={table}
              disabled={routes?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={routes?.length == 0}
              onClick={() => {
                mutate("/setup-keys").then();
                mutate("/groups").then();
              }}
            />
          </>
        )}
      </DataTable>
    </RouteAddRoutingPeerProvider>
  );
}
