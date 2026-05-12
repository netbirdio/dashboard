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
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";
import useFetchApi from "@/utils/api";
import SelfHostedProxiesActionCell from "@/modules/reverse-proxy/self-hosted-proxies/SelfHostedProxiesActionCell";
import SelfHostedProxiesConnectedCell from "@/modules/reverse-proxy/self-hosted-proxies/SelfHostedProxiesConnectedCell";
import { SelfHostedProxiesModal } from "@/modules/reverse-proxy/self-hosted-proxies/SelfHostedProxiesModal";
import SelfHostedProxiesNameCell from "@/modules/reverse-proxy/self-hosted-proxies/SelfHostedProxiesNameCell";

const ClustersColumns: ColumnDef<ReverseProxyCluster>[] = [
  {
    accessorKey: "address",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Proxy Cluster</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <SelfHostedProxiesNameCell cluster={row.original} />,
  },
  {
    accessorKey: "connected_proxies",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>Connected Proxies</DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <SelfHostedProxiesConnectedCell cluster={row.original} />
    ),
  },
  {
    id: "searchString",
    accessorFn: (row) => row.address,
  },
  {
    id: "actions",
    accessorKey: "address",
    header: "",
    cell: ({ row }) => <SelfHostedProxiesActionCell cluster={row.original} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function SelfHostedProxiesTable({
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { data: clusters, isLoading } = useFetchApi<ReverseProxyCluster[]>(
    "/reverse-proxies/clusters",
  );

  const selfHostedClusters = useMemo(() => {
    return clusters?.filter((c) => c.self_hosted) ?? [];
  }, [clusters]);

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
      <SelfHostedProxiesModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        key={addModalOpen ? 1 : 0}
      />

      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        inset={false}
        keepStateInLocalStorage={false}
        text={"Self-Hosted Proxies"}
        sorting={sorting}
        setSorting={setSorting}
        columns={ClustersColumns}
        data={selfHostedClusters}
        useRowId={true}
        searchPlaceholder={"Search by proxy cluster domain..."}
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
            title={"Setup Your Own Self-Hosted Proxy Cluster"}
            description={
              "Setup self-hosted proxies on your own infrastructure for full control over traffic and geographic location."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                Setup Proxy
              </Button>
            }
          />
        }
        rightSide={() => (
          <>
            {selfHostedClusters.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                Setup Proxy
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={selfHostedClusters.length === 0}
            />
            <DataTableRefreshButton
              isDisabled={selfHostedClusters.length === 0}
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
