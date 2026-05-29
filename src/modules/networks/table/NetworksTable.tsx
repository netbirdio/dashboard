import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
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
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Network } from "@/interfaces/Network";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import {
  NetworkProvider,
  useNetworksContext,
} from "@/modules/networks/NetworkProvider";
import NetworkActionCell from "@/modules/networks/table/NetworkActionCell";
import NetworkNameCell from "@/modules/networks/table/NetworkNameCell";
import { NetworkPolicyCell } from "@/modules/networks/table/NetworkPolicyCell";
import { NetworkResourceCell } from "@/modules/networks/table/NetworkResourceCell";
import NetworkRoutingPeerCell from "@/modules/networks/table/NetworkRoutingPeerCell";
import { GlobalSearchModal } from "@/modules/search/GlobalSearchModal";

export const NetworkTableColumns: ColumnDef<Network>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column}>Network</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <NetworkNameCell network={row.original} />,
  },
  {
    accessorKey: "description",
  },
  {
    accessorKey: "resources",
    accessorFn: (network) => network?.resources?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Resources</DataTableHeader>;
    },
    cell: ({ row }) => <NetworkResourceCell network={row.original} />,
  },
  {
    accessorKey: "policies",
    accessorFn: (network) => network?.policies?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Policies</DataTableHeader>;
    },
    cell: ({ row }) => <NetworkPolicyCell network={row.original} />,
  },
  {
    accessorKey: "routers",
    accessorFn: (network) => network?.routers?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Routing Peers</DataTableHeader>;
    },
    cell: ({ row }) => <NetworkRoutingPeerCell network={row.original} />,
  },
  {
    id: "active",
    accessorFn: (network) => (network?.routing_peers_count ?? 0) > 0,
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <NetworkActionCell network={row.original} />,
  },
];

type Props = {
  data?: Network[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function NetworksTable({
  isLoading,
  data,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const [searchModal, setSearchModal] = useState(false);

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: false,
      },
    ],
  );

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
        id: "active",
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
    <>
      <GlobalSearchModal open={searchModal} setOpen={setSearchModal} />
      <NetworkAccessControlProvider>
        <NetworkProvider>
          <DataTable
            headingTarget={headingTarget}
            isLoading={isLoading}
            text={"Networks"}
            sorting={sorting}
            setSorting={setSorting}
            columns={NetworkTableColumns}
            data={data}
            initialPageSize={25}
            showResetFilterButton={false}
            searchPlaceholder={"Search by network name or description..."}
            columnVisibility={{
              description: false,
              active: false,
            }}
            aboveTable={(table) => (
              <TableFilterChips table={table} filters={filterDefs} />
            )}
            onSearchClick={() => setSearchModal(true)}
            getStartedCard={
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
                title={"Create New Network"}
                description={
                  "It looks like you don't have any networks. Access internal resources in your LANs and VPC by adding a network."
                }
                button={
                  <div className={"gap-x-4 flex items-center justify-center"}>
                    <AddNetworkButton />
                  </div>
                }
                learnMore={
                  <>
                    Learn more about
                    <InlineLink
                      href={"https://docs.netbird.io/how-to/networks"}
                      target={"_blank"}
                    >
                      Networks
                      <ExternalLinkIcon size={12} />
                    </InlineLink>
                  </>
                }
              />
            }
            rightSide={() =>
              data &&
              data.length > 0 && (
                <div className={cn("gap-x-4 ml-auto flex")}>
                  <AddNetworkButton />
                </div>
              )
            }
          >
            {(table) => (
              <>
                <TableFiltersButton
                  table={table}
                  filters={filterDefs}
                  disabled={data?.length == 0}
                />
                <DataTableResetFilterButton
                  table={table}
                  onClick={() => {
                    table.setPageIndex(0);
                    table.resetColumnFilters();
                    table.resetGlobalFilter();
                  }}
                />
                <DataTableRefreshButton
                  isDisabled={data?.length == 0}
                  onClick={() => {
                    mutate("/networks").then();
                  }}
                />
              </>
            )}
          </DataTable>
        </NetworkProvider>
      </NetworkAccessControlProvider>
    </>
  );
}

const AddNetworkButton = () => {
  const { permission } = usePermissions();

  const { openCreateNetworkModal } = useNetworksContext();
  return (
    <Button
      variant={"primary"}
      onClick={openCreateNetworkModal}
      disabled={!permission.networks.create}
    >
      <PlusCircle size={16} />
      Add Network
    </Button>
  );
};
