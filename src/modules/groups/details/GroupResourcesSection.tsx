import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ENABLED_COLUMN_CLASS } from "@components/table/enabledColumnClass";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { ArrowUpRightIcon, Layers3Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResourceWithNetwork } from "@/interfaces/Network";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import {
  NetworkProvider,
  useNetworksContext,
} from "@/modules/networks/NetworkProvider";
import { ResourceActionCell } from "@/modules/networks/resources/ResourceActionCell";
import ResourceAddressCell from "@/modules/networks/resources/ResourceAddressCell";
import { ResourceEnabledCell } from "@/modules/networks/resources/ResourceEnabledCell";
import { ResourceGroupCell } from "@/modules/networks/resources/ResourceGroupCell";
import ResourceNameCell from "@/modules/networks/resources/ResourceNameCell";
import { ResourceNetworkCell } from "@/modules/networks/resources/ResourceNetworkCell";
import { ResourcePolicyCell } from "@/modules/networks/resources/ResourcePolicyCell";
import { ownClicks } from "@/modules/networks/resources/useResourceTable";

const GroupResourcesColumns: ColumnDef<NetworkResourceWithNetwork>[] = [
  {
    id: "id",
    accessorKey: "id",
    filterFn: "exactMatch",
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Resource</DataTableHeader>;
    },
    cell: ({ row }) => {
      return ownClicks(
        <ResourceNameCell resource={row.original} inClickableRow />,
      );
    },
  },
  {
    id: "description",
    accessorKey: "description",
    accessorFn: (resource) =>
      removeAllSpaces(resource?.description || "").toLowerCase(),
  },
  {
    id: "address",
    accessorKey: "address",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Address</DataTableHeader>;
    },
    cell: ({ row }) => {
      return ownClicks(<ResourceAddressCell resource={row.original} />);
    },
  },
  {
    id: "network",
    accessorFn: (resource) => resource.network.name,
    header: ({ column }) => {
      return <DataTableHeader column={column}>Network</DataTableHeader>;
    },
    cell: ({ row }) => {
      return ownClicks(<ResourceNetworkCell network={row.original.network} />);
    },
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    enableSorting: false,
    meta: { className: ENABLED_COLUMN_CLASS.xl },
    header: ({ column }) => {
      return (
        <DataTableHeader column={column} sorting={false}>
          Active
        </DataTableHeader>
      );
    },
    cell: ({ row }) =>
      ownClicks(<ResourceEnabledCell resource={row.original} />),
  },
  {
    id: "groups",
    accessorFn: (resource) => {
      let groups = resource?.groups as Group[];
      return groups.map((group) => group.name).join(", ");
    },
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    cell: ({ row }) => {
      return ownClicks(<ResourceGroupCell resource={row.original} />);
    },
  },
  {
    id: "policies",
    accessorKey: "id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Policies</DataTableHeader>;
    },
    cell: ({ row }) => {
      return ownClicks(<ResourcePolicyCell resource={row.original} />);
    },
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return ownClicks(
        <ResourceActionCell resource={row.original} />,
        "ml-auto",
      );
    },
  },
];

type Props = {
  resources?: NetworkResourceWithNetwork[];
  isLoading?: boolean;
};

/**
 * The provider around the table opens a resource on row click;
 * each row has its own inside, bound to that row's network, for its cells.
 */
export const GroupResourcesSection = (props: Props) => (
  <NetworkAccessControlProvider>
    <NetworkProvider>
      <GroupResourcesTable {...props} />
    </NetworkProvider>
  </NetworkAccessControlProvider>
);

const GroupResourcesTable = ({ resources, isLoading = true }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { permission } = usePermissions();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { openResourceModal } = useNetworksContext();

  return (
    <GroupDetailsTableContainer>
      <DataTable
        wrapperComponent={Card}
        wrapperProps={{ className: "mt-6 pb-2 w-full" }}
        sorting={sorting}
        setSorting={setSorting}
        minimal={true}
        isLoading={isLoading}
        showSearchAndFilters={true}
        onRowClick={
          permission.networks.update
            ? (row) => openResourceModal(row.original.network, row.original)
            : undefined
        }
        renderRow={(row, children) => (
          <NetworkProvider
            key={row.network.id + row.name}
            network={row.network}
            onResourceUpdate={() => mutate("/networks/resources")}
            onResourceDelete={() => mutate("/networks/resources")}
          >
            {children}
          </NetworkProvider>
        )}
        inset={false}
        tableClassName={"mt-0"}
        text={"Resources"}
        columns={GroupResourcesColumns}
        keepStateInLocalStorage={false}
        data={resources}
        searchPlaceholder={"Search by name, address, network or group..."}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"This group has no assigned resources"}
            description={
              "Assign this group to your resources inside your networks to see them listed here."
            }
            icon={<Layers3Icon size={20} className={"text-nb-gray-300"} />}
          >
            {permission?.networks?.create && (
              <>
                <Button
                  variant={"primary"}
                  className={"mt-4"}
                  onClick={() => router.push("/networks")}
                >
                  Go to Networks
                  <ArrowUpRightIcon size={16} />
                </Button>
              </>
            )}
          </NoResults>
        }
        columnVisibility={{
          description: false,
          id: false,
        }}
        paginationPaddingClassName={"px-0 pt-8"}
      >
        {(table) => (
          <DataTableRowsPerPage
            table={table}
            disabled={!resources || resources?.length == 0}
          />
        )}
      </DataTable>
    </GroupDetailsTableContainer>
  );
};
