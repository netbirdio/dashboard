import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
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
import NoResults from "@components/ui/NoResults";
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { ArrowUpRightIcon, Layers3Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useMemo, useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  isResourceTargetType,
  useReverseProxies,
} from "@/contexts/ReverseProxiesProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { ResourceActionCell } from "@/modules/networks/resources/ResourceActionCell";
import { ResourceExposeServiceCell } from "@/modules/networks/resources/ResourceExposeServiceCell";
import ResourceAddressCell from "@/modules/networks/resources/ResourceAddressCell";
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
  },
  {
    id: "groups",
    accessorFn: (resource) => {
      let groups = (resource?.groups ?? []) as Group[];
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
    id: "group_names",
    accessorFn: (resource) => {
      const groups = (resource?.groups ?? []) as Group[];
      return groups.map((g) => g.name).filter((n): n is string => !!n);
    },
    filterFn: "arrIncludesSome",
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
  const { reverseProxies } = useReverseProxies();

  const exposedResourceIds = useMemo(() => {
    const ids = new Set<string>();
    if (!reverseProxies) return ids;
    for (const proxy of reverseProxies) {
      for (const target of proxy.targets ?? []) {
        if (isResourceTargetType(target.target_type) && target.target_id) {
          ids.add(target.target_id);
        }
      }
    }
    return ids;
  }, [reverseProxies]);

  const tableGroups = useMemo(() => {
    if (!resources) return [];
    const map = new Map<string, { id?: string; name: string }>();
    for (const resource of resources) {
      const groups = (resource?.groups ?? []) as Group[];
      for (const g of groups) {
        if (g?.name && !map.has(g.name)) {
          map.set(g.name, { id: g.id, name: g.name });
        }
      }
    }
    return Array.from(map.values());
  }, [resources]);

  const columns = useMemo<ColumnDef<NetworkResource>[]>(
    () => [
      ...NetworkResourceColumns,
      {
        id: "exposed",
        accessorFn: (resource) =>
          resource?.id ? exposedResourceIds.has(resource.id) : false,
      },
    ],
    [exposedResourceIds],
  );

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Active", dotClass: "bg-green-500" },
      { value: false, label: "Inactive", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const exposedOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All" },
      { value: true, label: "Exposed" },
      { value: false, label: "Not Exposed" },
    ],
    [],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "enabled",
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
      {
        id: "group_names",
        label: "Groups",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={tableGroups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
      {
        id: "exposed",
        label: "Service",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={exposedOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, exposedOptions),
      },
    ],
    [statusOptions, exposedOptions, tableGroups],
  );

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
      text={"Resources"}
      columns={columns}
      keepStateInLocalStorage={false}
      initialPageSize={25}
      showResetFilterButton={false}
      initialFilters={
        resourceId ? [{ id: "id", value: resourceId }] : undefined
      }
      initialSearch={resourceId}
      onFilterReset={removeResourceParam}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      data={resources}
      searchPlaceholder={"Search by name, address or group..."}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={
            isGroupPage
              ? "This group has no assigned resources"
              : "This network has no resources"
          }
          description={
            isGroupPage
              ? "Assign this group to your resources inside your networks to see them listed here."
              : "Add resources to this network to control what peers can access. Resources can be anything from a single IP, a subnet, or a domain."
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
        enabled: false,
        group_names: false,
        exposed: false,
      }}
      rowClassName={(row) => (row.original.enabled ? "" : "opacity-50")}
      paginationPaddingClassName={"px-0 pt-8"}
      rightSide={
        !isGroupPage
          ? () => (
              <Button
                variant={"primary"}
                className={"ml-auto mr-4"}
                onClick={() => network && openResourceModal(network)}
                disabled={!permission.networks.update}
              >
                <IconCirclePlus size={16} />
                Add
              </Button>
            )
          : undefined
      }
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={!resources || resources?.length == 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
              removeResourceParam();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
