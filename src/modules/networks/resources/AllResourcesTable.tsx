import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import { fadeDisabledRowCells } from "@components/table/disabledRowCells";
import {
  TableFilterChips,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import { SortingState } from "@tanstack/react-table";
import {
  ArrowUpRightIcon,
  ExternalLinkIcon,
  Layers3Icon,
  PlusCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResourceWithNetwork } from "@/interfaces/Network";
import {
  NetworkProvider,
  useNetworksContext,
} from "@/modules/networks/NetworkProvider";
import {
  networkOf,
  RESOURCE_HIDDEN_COLUMNS,
  useResourceTable,
} from "@/modules/networks/resources/useResourceTable";

type Props = {
  resources?: NetworkResourceWithNetwork[];
  networks?: Network[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

/**
 * Every resource of the account, whichever network it is in.
 * Each row gets its own NetworkProvider,
 * so the shared resource cells act on that row's network.
 */
export default function AllResourcesTable({
  resources,
  networks,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { permission } = usePermissions();
  const { openResourceModal } = useNetworksContext();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const { columns, filterDefs } = useResourceTable({
    resources,
    networks: networks ?? [],
  });
  const hasNetworks = !!networks && networks.length > 0;
  // Without a network to pick, the modal is only useful to someone who can create one in it.
  const canAddResource = hasNetworks || permission.networks.create;
  const refresh = () => mutate("/networks/resources");

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Resources"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={resources}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={"Search by name, address, network or group..."}
      columnVisibility={RESOURCE_HIDDEN_COLUMNS}
      cellClassName={fadeDisabledRowCells}
      onRowClick={
        permission.networks.update
          ? (row) => {
              const network = networkOf(row.original);
              if (network) openResourceModal(network, row.original);
            }
          : undefined
      }
      renderRow={(resource, children) => {
        const network = networkOf(resource);
        return (
          <NetworkProvider
            key={`${network?.id}-${resource.id}`}
            network={network}
            onResourceUpdate={refresh}
            onResourceDelete={refresh}
          >
            {children}
          </NetworkProvider>
        );
      }}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<Layers3Icon className={"text-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Add New Resource"}
          description={
            hasNetworks
              ? "It looks like your networks don't have any resources. Add a host, a subnet or a domain to a network to control what peers can access."
              : "Resources live inside networks. Add a resource and create its network along the way, so your peers can reach hosts, subnets and domains."
          }
          button={
            <div className={"gap-x-4 flex items-center justify-center"}>
              {canAddResource ? (
                <AddResourceToNetworkButton networks={networks} />
              ) : (
                <Button
                  variant={"primary"}
                  onClick={() => router.push("/networks")}
                >
                  Go to Networks
                  <ArrowUpRightIcon size={16} />
                </Button>
              )}
            </div>
          }
          learnMore={
            <>
              Learn more about
              <InlineLink
                href={"https://docs.netbird.io/how-to/networks#resources"}
                target={"_blank"}
              >
                Resources
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() =>
        resources &&
        resources.length > 0 && (
          <div className={"gap-x-4 ml-auto flex"}>
            <AddResourceToNetworkButton networks={networks} />
          </div>
        )
      }
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={resources?.length == 0}
          />
          <DataTableRefreshButton
            isDisabled={resources?.length == 0}
            onClick={() => {
              mutate("/networks").then();
              refresh().then();
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
  );
}

/** Opens the resource modal, where the network is the first thing to pick. */
const AddResourceToNetworkButton = ({ networks }: { networks?: Network[] }) => {
  const { permission } = usePermissions();
  const { openNewResourceModal } = useNetworksContext();

  if (!networks) return null;

  return (
    <Button
      variant={"primary"}
      onClick={() => openNewResourceModal(networks)}
      disabled={!permission.networks.update}
      data-testid={"add-resource"}
    >
      <PlusCircle size={16} />
      Add Resource
    </Button>
  );
};
