import DataTableHeader from "@components/table/DataTableHeader";
import { ENABLED_COLUMN_ID } from "@components/table/disabledRowCells";
import { ENABLED_COLUMN_CLASS } from "@components/table/enabledColumnClass";
import {
  CheckboxListPicker,
  CheckboxOption,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import { stopRowClick } from "@components/table/stopRowClick";
import { TableFilterDef } from "@components/table/TableFilters";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { cn, removeAllSpaces } from "@utils/helpers";
import * as React from "react";
import { useMemo } from "react";
import {
  isResourceTargetType,
  useReverseProxies,
} from "@/contexts/ReverseProxiesProvider";
import { Group } from "@/interfaces/Group";
import {
  Network,
  NetworkResource,
  NetworkResourceWithNetwork,
} from "@/interfaces/Network";
import { ResourceActionCell } from "@/modules/networks/resources/ResourceActionCell";
import ResourceAddressCell from "@/modules/networks/resources/ResourceAddressCell";
import { ResourceEnabledCell } from "@/modules/networks/resources/ResourceEnabledCell";
import { ResourceExposeServiceCell } from "@/modules/networks/resources/ResourceExposeServiceCell";
import { ResourceGroupCell } from "@/modules/networks/resources/ResourceGroupCell";
import ResourceNameCell from "@/modules/networks/resources/ResourceNameCell";
import { ResourceNetworkCell } from "@/modules/networks/resources/ResourceNetworkCell";
import { ResourcePolicyCell } from "@/modules/networks/resources/ResourcePolicyCell";

export const networkOf = (resource: NetworkResource): Network | undefined =>
  (resource as Partial<NetworkResourceWithNetwork>).network;

/** The columns that only help filtering and searching, never shown. */
export const RESOURCE_HIDDEN_COLUMNS = {
  description: false,
  id: false,
  group_names: false,
  exposed: false,
  network_id: false,
};

type Options = {
  resources?: NetworkResource[];
  /**
   * Set on the account-wide list, whose rows are `NetworkResourceWithNetwork`:
   * adds the Network filter.
   */
  networks?: Network[];
};

/**
 * The columns and filters every resources table shares.
 * The "network" column is for the account-wide list;
 * a table inside one network hides it through `columnVisibility`.
 */
export const useResourceTable = ({ resources, networks }: Options) => {
  const { reverseProxies } = useReverseProxies();
  const acrossNetworks = !!networks;

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
      ...NetworkResourceColumns.map((column) =>
        acrossNetworks && column.id === "name"
          ? {
              ...column,
              cell: ({ row }: CellContext<NetworkResource, unknown>) =>
                ownClicks(
                  <ResourceNameCell
                    resource={row.original}
                    inClickableRow
                    inset
                    fluid
                  />,
                ),
            }
          : column,
      ),
      {
        id: "exposed",
        accessorFn: (resource) =>
          resource?.id ? exposedResourceIds.has(resource.id) : false,
      },
    ],
    [exposedResourceIds, acrossNetworks],
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

  const networkOptions = useMemo<CheckboxOption<string>[]>(
    () =>
      (networks ?? []).map((network) => ({
        value: network.id,
        label: network.name,
      })),
    [networks],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      ...(acrossNetworks
        ? [
            {
              id: "network_id",
              label: "Network",
              renderPicker: (p) => (
                <CheckboxListPicker
                  value={p.value as string[] | undefined}
                  onChange={p.onChange}
                  close={p.close}
                  options={networkOptions}
                />
              ),
              formatChip: (v) =>
                formatCheckboxChip(
                  v as string[] | undefined,
                  networkOptions,
                  "networks",
                ),
            } satisfies TableFilterDef,
          ]
        : []),
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
    [
      statusOptions,
      exposedOptions,
      tableGroups,
      acrossNetworks,
      networkOptions,
    ],
  );

  return { columns, filterDefs };
};

/**
 * A cell whose controls act on their own.
 * It is only as wide as its content,
 * so the rest of the cell still counts as a click on the row.
 */
const ownClicks = (cell: React.ReactNode, className?: string) => (
  <div
    className={cn("w-fit max-w-full min-w-0", className)}
    onClick={stopRowClick}
  >
    {cell}
  </div>
);

const NetworkResourceColumns: ColumnDef<NetworkResource>[] = [
  {
    id: "id",
    accessorKey: "id",
    filterFn: "exactMatch",
  },
  {
    id: "name",
    accessorKey: "name",
    meta: { minWidth: 280 },
    header: ({ column }) => {
      return <DataTableHeader column={column}>Resource</DataTableHeader>;
    },
    cell: ({ row }) => {
      return ownClicks(
        <ResourceNameCell resource={row.original} inClickableRow fluid />,
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
    accessorFn: (resource) => networkOf(resource)?.name ?? "",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Network</DataTableHeader>;
    },
    cell: ({ row }) => {
      const network = networkOf(row.original);
      return network
        ? ownClicks(<ResourceNetworkCell network={network} />)
        : null;
    },
  },
  {
    id: "network_id",
    accessorFn: (resource) => {
      const id = networkOf(resource)?.id;
      return id ? [id] : [];
    },
    filterFn: "arrIncludesSome",
  },
  {
    id: ENABLED_COLUMN_ID,
    accessorKey: "enabled",
    enableSorting: false,
    meta: { className: ENABLED_COLUMN_CLASS.xl, fit: true },
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
      let groups = (resource?.groups ?? []) as Group[];
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
      return ownClicks(<ResourcePolicyCell resource={row.original} />);
    },
  },
  {
    id: "expose_service",
    accessorKey: "id",
    header: "",
    meta: { fit: true },
    cell: ({ row }) => {
      return ownClicks(<ResourceExposeServiceCell resource={row.original} />);
    },
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    meta: { fit: true },
    cell: ({ row }) => {
      return ownClicks(
        <ResourceActionCell resource={row.original} />,
        "ml-auto",
      );
    },
  },
];
