import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
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
import { NetworkProvider } from "@/modules/networks/NetworkProvider";
import { ResourceActionCell } from "@/modules/networks/resources/ResourceActionCell";
import ResourceAddressCell from "@/modules/networks/resources/ResourceAddressCell";
import { ResourceEnabledCell } from "@/modules/networks/resources/ResourceEnabledCell";
import { ResourceGroupCell } from "@/modules/networks/resources/ResourceGroupCell";
import ResourceNameCell from "@/modules/networks/resources/ResourceNameCell";
import { ResourcePolicyCell } from "@/modules/networks/resources/ResourcePolicyCell";

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
      return <ResourceNameCell resource={row.original} />;
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
      return <ResourceAddressCell resource={row.original} />;
    },
  },
  {
    id: "enabled",
    accessorKey: "enabled",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ row }) => (
      <ResourceEnabledCell
        resource={row.original}
        mutateAllResourcesOnUpdate={true}
      />
    ),
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
      return <ResourceGroupCell resource={row.original} />;
    },
  },
  {
    id: "policies",
    accessorKey: "id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Policies</DataTableHeader>;
    },
    cell: ({ row }) => {
      return <ResourcePolicyCell resource={row.original} />;
    },
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return <ResourceActionCell resource={row.original} />;
    },
  },
];

type Props = {
  resources?: NetworkResourceWithNetwork[];
  isLoading?: boolean;
};

export const GroupResourcesSection = ({
  resources,
  isLoading = true,
}: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { permission } = usePermissions();
  const router = useRouter();
  const { mutate } = useSWRConfig();

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
        renderRow={(row, children) => (
          <NetworkProvider
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
        searchPlaceholder={"Search by name, address or group..."}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"This group has no assigned resources"}
            description={
              "Assign this group to your resources inside your networks to see them listed here."
            }
            icon={<Layers3Icon size={20} />}
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
