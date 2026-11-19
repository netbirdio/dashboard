import Button from "@components/Button";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
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
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { PlusCircle, ServerIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  ReverseProxyCluster,
  ReverseProxyClusterType,
} from "@/interfaces/ReverseProxy";
import ClustersActionCell from "@/modules/reverse-proxy/clusters/ClustersActionCell";
import ClustersConnectedCell from "@/modules/reverse-proxy/clusters/ClustersConnectedCell";
import ClustersFeaturesCell from "@/modules/reverse-proxy/clusters/ClustersFeaturesCell";
import { ClustersModal } from "@/modules/reverse-proxy/clusters/ClustersModal";
import ClustersNameCell from "@/modules/reverse-proxy/clusters/ClustersNameCell";
import useFetchApi from "@/utils/api";

const ClustersColumns: ColumnDef<ReverseProxyCluster>[] = [
  {
    accessorKey: "address",
    header: ({ column }) => {
      return <DataTableHeader column={column} labelId="common.cluster" />;
    },
    sortingFn: "text",
    cell: ({ row }) => <ClustersNameCell cluster={row.original} />,
  },
  {
    accessorKey: "connected_proxies",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          labelId="reverseProxy.connectedProxies"
        />
      );
    },
    sortingFn: "basic",
    cell: ({ row }) => <ClustersConnectedCell cluster={row.original} />,
  },
  {
    id: "features",
    header: ({ column }) => (
      <DataTableHeader column={column} labelId="reverseProxy.features" />
    ),
    enableSorting: false,
    cell: ({ row }) => <ClustersFeaturesCell cluster={row.original} />,
  },
  {
    id: "searchString",
    accessorFn: (row) => row.address,
  },
  {
    id: "online",
    accessorKey: "online",
    filterFn: "exactMatch",
  },
  {
    id: "type",
    accessorKey: "type",
    filterFn: "exactMatch",
  },
  {
    id: "actions",
    accessorKey: "address",
    header: "",
    cell: ({ row }) => <ClustersActionCell cluster={row.original} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function ClustersTable({ headingTarget }: Readonly<Props>) {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { data: clusters, isLoading } = useFetchApi<ReverseProxyCluster[]>(
    "/reverse-proxies/clusters",
  );

  const rows = clusters ?? [];

  const [addModalOpen, setAddModalOpen] = useState(false);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "address",
        desc: false,
      },
    ],
  );

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      {
        value: undefined,
        id: "all",
        label: t("common.all"),
        dotClass: "bg-nb-gray-500",
      },
      {
        value: true,
        id: "online",
        label: t("common.online"),
        dotClass: "bg-green-500",
      },
      {
        value: false,
        id: "offline",
        label: t("common.offline"),
        dotClass: "bg-red-500",
      },
    ],
    [t],
  );

  const typeOptions = useMemo<RadioOption<string | undefined>[]>(
    () => [
      { value: undefined, id: "all", label: t("common.all") },
      {
        value: ReverseProxyClusterType.SHARED,
        id: "shared",
        label: t("reverseProxy.shared"),
      },
      {
        value: ReverseProxyClusterType.ACCOUNT,
        id: "self-hosted",
        label: t("reverseProxy.selfHosted"),
      },
    ],
    [t],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "online",
        label: t("common.status"),
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
      {
        id: "type",
        label: t("common.type"),
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as string | undefined}
            onChange={p.onChange}
            close={p.close}
            options={typeOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as string | undefined, typeOptions),
      },
    ],
    [statusOptions, typeOptions, t],
  );

  return (
    <>
      <ClustersModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        key={addModalOpen ? 1 : 0}
      />

      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        inset={false}
        keepStateInLocalStorage={false}
        initialPageSize={25}
        showResetFilterButton={false}
        text={t("common.clusters")}
        sorting={sorting}
        setSorting={setSorting}
        columns={ClustersColumns}
        data={rows}
        useRowId={true}
        searchPlaceholder={t("reverseProxy.searchClusterDomain")}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
        columnVisibility={{
          searchString: false,
          online: false,
          type: false,
        }}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<ServerIcon className={"text-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={t("reverseProxy.noClusters")}
            description={t(
              "reverseProxy.setUpAClusterToRouteTrafficThroughYourOwnInfrastructure",
            )}
            button={
              <Button
                variant={"primary"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                {t("reverseProxy.setupSelfHostedCluster")}
              </Button>
            }
          />
        }
        rightSide={() => (
          <>
            {rows.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                {t("reverseProxy.setupSelfHostedCluster")}
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <TableFiltersButton
              table={table}
              filters={filterDefs}
              disabled={rows.length === 0}
            />
            <DataTableRefreshButton
              isDisabled={rows.length === 0}
              onClick={() => {
                mutate("/reverse-proxies/clusters").then();
              }}
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
    </>
  );
}
