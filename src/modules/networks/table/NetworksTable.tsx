import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Network } from "@/interfaces/Network";
import {
  NetworkProvider,
  useNetworksContext,
} from "@/modules/networks/NetworkProvider";
import NetworkActionCell from "@/modules/networks/table/NetworkActionCell";
import NetworkNameCell from "@/modules/networks/table/NetworkNameCell";
import { NetworkPolicyCell } from "@/modules/networks/table/NetworkPolicyCell";
import { NetworkResourceCell } from "@/modules/networks/table/NetworkResourceCell";
import NetworkRoutingPeerCell from "@/modules/networks/table/NetworkRoutingPeerCell";

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
    accessorKey: "routers",
    accessorFn: (network) => network?.routers?.length,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Routing Peers</DataTableHeader>;
    },
    cell: ({ row }) => <NetworkRoutingPeerCell network={row.original} />,
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
}: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();

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

  const { confirm } = useDialog();

  const showConfirm = async () => {
    const choice = await confirm({
      title: `Do you want to add a resource to 'Office Network' now?`,
      description:
        "Peers will be able to access your network resources once you add them.",
      confirmText: "Add Resource",
      cancelText: "Later",
      type: "default",
    });
    if (!choice) return;
  };

  return (
    <NetworkProvider>
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Networks"}
        sorting={sorting}
        setSorting={setSorting}
        columns={NetworkTableColumns}
        data={data}
        searchPlaceholder={"Search by network name or description..."}
        columnVisibility={{
          description: false,
        }}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <NetworkRoutesIcon className={"fill-nb-gray-200"} size={20} />
                }
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create New Network"}
            description={
              "It looks like you don't have any networks. Access resources like LANs and VPC by adding a network."
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
                  href={
                    "https://docs.netbird.io/how-to/networks-concept"
                  }
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
            <DataTableRowsPerPage table={table} disabled={data?.length == 0} />
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
  );
}

const AddNetworkButton = () => {
  const { openCreateNetworkModal } = useNetworksContext();
  return (
    <Button variant={"primary"} onClick={openCreateNetworkModal}>
      <PlusCircle size={16} />
      Add Network
    </Button>
  );
};
