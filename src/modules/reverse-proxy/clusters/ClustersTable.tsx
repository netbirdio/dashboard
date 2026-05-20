import Button from "@components/Button";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";

import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { PlusCircle, ServerIcon } from "lucide-react";

import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";
import useFetchApi from "@/utils/api";
import ClustersActionCell from "@/modules/reverse-proxy/clusters/ClustersActionCell";
import ClustersConnectedCell from "@/modules/reverse-proxy/clusters/ClustersConnectedCell";
import ClustersFeaturesCell from "@/modules/reverse-proxy/clusters/ClustersFeaturesCell";
import { ClustersModal } from "@/modules/reverse-proxy/clusters/ClustersModal";
import ClustersNameCell from "@/modules/reverse-proxy/clusters/ClustersNameCell";

const ClustersColumns: ColumnDef<ReverseProxyCluster>[] = [
  {
    accessorKey: "address",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Cluster</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <ClustersNameCell cluster={row.original} />,
  },
  {
    accessorKey: "connected_proxies",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>Connected Proxies</DataTableHeader>
      );
    },
    sortingFn: "basic",
    cell: ({ row }) => <ClustersConnectedCell cluster={row.original} />,
  },
  {
    id: "features",
    header: () => <span className={"font-medium text-xs"}>Features</span>,
    enableSorting: false,
    cell: ({ row }) => <ClustersFeaturesCell cluster={row.original} />,
  },
  {
    id: "searchString",
    accessorFn: (row) => row.address,
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
        text={"Clusters"}
        sorting={sorting}
        setSorting={setSorting}
        columns={ClustersColumns}
        data={rows}
        useRowId={true}
        searchPlaceholder={"Search by cluster domain..."}
        columnVisibility={{ searchString: false }}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<ServerIcon className={"text-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"No clusters available"}
            description={
              "There are no shared clusters connected to your account and no self-hosted clusters configured. Set up a self-hosted cluster to route traffic through your own infrastructure — see the documentation linked above for setup steps."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                Setup Self-Hosted Cluster
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
                Setup Self-Hosted Cluster
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={rows.length === 0}
            />
            <DataTableRefreshButton
              isDisabled={rows.length === 0}
              onClick={() => {
                mutate("/reverse-proxies/clusters").then();
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
