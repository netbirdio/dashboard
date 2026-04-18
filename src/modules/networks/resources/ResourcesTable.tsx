import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { ArrowUpRightIcon, Layers3Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { ResourceActionCell } from "@/modules/networks/resources/ResourceActionCell";
import { ResourceExposeServiceCell } from "@/modules/networks/resources/ResourceExposeServiceCell";
import ResourceAddressCell from "@/modules/networks/resources/ResourceAddressCell";
import { ResourceEnabledCell } from "@/modules/networks/resources/ResourceEnabledCell";
import { ResourceGroupCell } from "@/modules/networks/resources/ResourceGroupCell";
import ResourceNameCell from "@/modules/networks/resources/ResourceNameCell";
import { ResourcePolicyCell } from "@/modules/networks/resources/ResourcePolicyCell";

type Props = {
  resources?: NetworkResource[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
};

const NetworkResourceColumns: ColumnDef<NetworkResource>[] = [
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
    cell: ({ row }) => <ResourceEnabledCell resource={row.original} />,
  },
  {
    id: "groups",
    accessorFn: (resource) => {
      let groups = (resource?.groups ?? []) as Group[];
      return groups.map((group) => group.name).join(", ");
    },
    header: ({ column }) => {
      return <DataTableHeader column={column}>Resource Groups</DataTableHeader>;
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
    id: "expose_service",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return <ResourceExposeServiceCell resource={row.original} />;
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
  isGroupPage,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const params = useSearchParams();
  const resourceId = params.get("resource") ?? undefined;

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "name",
      desc: false,
    },
  ]);
  const { openResourceModal, network } = useNetworksContext();
  const router = useRouter();

  const removeResourceParam = React.useCallback(() => {
    if (!resourceId) return;
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("resource");
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }, [resourceId, params, router]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 pb-2 w-full" }}
      headingTarget={headingTarget}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      text={t("networkResources.linkLabel")}
      columns={NetworkResourceColumns.map(
        (column): ColumnDef<NetworkResource> => {
        if (column.id === "name") {
          return {
            ...column,
            header: ({ column: tableColumn }: { column: any }) => (
              <DataTableHeader column={tableColumn}>
                {t("networkResources.resourceTab")}
              </DataTableHeader>
            ),
          } as ColumnDef<NetworkResource>;
        }
        if (column.id === "address") {
          return {
            ...column,
            header: ({ column: tableColumn }: { column: any }) => (
              <DataTableHeader column={tableColumn}>
                {t("resourcesTable.address")}
              </DataTableHeader>
            ),
          } as ColumnDef<NetworkResource>;
        }
        if (column.id === "enabled") {
          return {
            ...column,
            header: ({ column: tableColumn }: { column: any }) => (
              <DataTableHeader column={tableColumn}>
                {t("resourcesTable.active")}
              </DataTableHeader>
            ),
          } as ColumnDef<NetworkResource>;
        }
        if (column.id === "groups") {
          return {
            ...column,
            header: ({ column: tableColumn }: { column: any }) => (
              <DataTableHeader column={tableColumn}>
                {t("networkResources.groupsLabel")}
              </DataTableHeader>
            ),
          } as ColumnDef<NetworkResource>;
        }
        if (column.id === "policies") {
          return {
            ...column,
            header: ({ column: tableColumn }: { column: any }) => (
              <DataTableHeader column={tableColumn}>
                {t("nav.policies")}
              </DataTableHeader>
            ),
          } as ColumnDef<NetworkResource>;
        }
        return column as ColumnDef<NetworkResource>;
        },
      )}
      keepStateInLocalStorage={false}
      initialFilters={
        resourceId ? [{ id: "id", value: resourceId }] : undefined
      }
      initialSearch={resourceId}
      onFilterReset={removeResourceParam}
      data={resources}
      searchPlaceholder={t("resourcesTable.searchPlaceholder")}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={
            isGroupPage
              ? t("resourcesTable.emptyGroupTitle")
              : t("resourcesTable.emptyNetworkTitle")
          }
          description={
            isGroupPage
              ? t("resourcesTable.emptyGroupDescription")
              : t("resourcesTable.emptyNetworkDescription")
          }
          icon={<Layers3Icon size={20} className={"text-nb-gray-400"} />}
        >
          {isGroupPage && permission?.networks?.create && (
            <>
              <Button
                variant={"primary"}
                className={"mt-4"}
                onClick={() => router.push("/networks")}
              >
                {t("resourcesTable.goToNetworks")}
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
      rightSide={
        !isGroupPage
          ? () => (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => network && openResourceModal(network)}
                disabled={!permission.networks.update}
              >
                <IconCirclePlus size={16} />
                {t("networkResources.add")}
              </Button>
            )
          : undefined
      }
    >
      {(table) => (
        <DataTableRowsPerPage
          table={table}
          disabled={!resources || resources?.length == 0}
        />
      )}
    </DataTable>
  );
}
