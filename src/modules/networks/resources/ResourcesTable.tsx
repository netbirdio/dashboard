import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { Layers3Icon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { ResourceActionCell } from "@/modules/networks/resources/ResourceActionCell";
import ResourceAddressCell from "@/modules/networks/resources/ResourceAddressCell";
import { ResourceGroupCell } from "@/modules/networks/resources/ResourceGroupCell";
import ResourceNameCell from "@/modules/networks/resources/ResourceNameCell";
import { ResourcePolicyCell } from "@/modules/networks/resources/ResourcePolicyCell";

type Props = {
  resources?: NetworkResource[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

const NetworkResourceColumns: ColumnDef<NetworkResource>[] = [
  {
    id: "id",
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Resource</DataTableHeader>;
    },
    cell: ({ row }) => {
      return <ResourceNameCell resource={row.original} />;
    },
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

export default function ResourcesTable({
  resources,
  isLoading,
  headingTarget,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const { openResourceModal, network } = useNetworksContext();

  return (
    <>
      <DataTable
        wrapperComponent={Card}
        wrapperProps={{ className: "mt-6 w-full" }}
        headingTarget={headingTarget}
        sorting={sorting}
        setSorting={setSorting}
        minimal={true}
        showSearchAndFilters={true}
        inset={false}
        tableClassName={"mt-0"}
        text={"Resources"}
        columns={NetworkResourceColumns}
        keepStateInLocalStorage={false}
        data={resources}
        searchPlaceholder={"Search by name, address or group..."}
        isLoading={isLoading}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"This network has no resources"}
            description={
              "Add resources to this network to control what peers can access. Resources can be anything from a single IP, a subnet, or a domain."
            }
            icon={<Layers3Icon size={20} />}
          />
        }
        columnVisibility={{}}
        paginationPaddingClassName={"px-0 pt-8"}
        rightSide={() => (
          <>
            <Button
              variant={"primary"}
              className={"ml-auto"}
              onClick={() => network && openResourceModal(network)}
            >
              <IconCirclePlus size={16} />
              Add Resource
            </Button>
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={!resources || resources?.length == 0}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
