import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
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
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { Layers3Icon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { AddGroupButton } from "@/components/ui/AddGroupButton";
import { GroupProvider } from "@/contexts/GroupProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import GroupsActionCell from "@/modules/groups/table/GroupsActionCell";
import GroupsCountCell from "@/modules/groups/table/GroupsCountCell";
import GroupsNameCell from "@/modules/groups/table/GroupsNameCell";
import useGroupsUsage, { GroupUsage } from "@/modules/groups/useGroupsUsage";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";

export const GroupsTableColumns: ColumnDef<GroupUsage>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    cell: ({ row }) => {
      const in_use = !!row.getValue("in_use");
      return (
        <GroupsNameCell
          active={in_use}
          group={{
            id: row.original?.id,
            issued: row.original?.issued,
            name: row.original?.name,
          }}
        />
      );
    },
    sortingFn: "text",
  },
  {
    accessorKey: "users_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-xs normal-case"}>Users</div>}
        >
          <TeamIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<TeamIcon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=users`}
        hidden={row.original.name === "All"}
        text={"User(s)"}
        count={row.original.users_count}
      />
    ),
  },
  {
    accessorKey: "peers_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-xs normal-case"}>Peers</div>}
        >
          <PeerIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<PeerIcon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=peers`}
        hidden={row.original.name === "All"}
        text={"Peer(s)"}
        count={row.original.peers_count}
      />
    ),
  },
  {
    accessorKey: "policies_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-xs normal-case"}>Policies</div>}
        >
          <AccessControlIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<AccessControlIcon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=policies`}
        text={row.original.policies_count === 1 ? "Policy" : "Policies"}
        count={row.original.policies_count}
      />
    ),
  },
  {
    accessorKey: "resources_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={
            <div className={"text-xs normal-case"}>Network Resources</div>
          }
        >
          <Layers3Icon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<Layers3Icon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=resources`}
        text={"Network Resource(s)"}
        count={row.original.resources_count}
      />
    ),
  },
  {
    accessorKey: "routes_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-xs normal-case"}>Network Routes</div>}
        >
          <NetworkRoutesIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<NetworkRoutesIcon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=network-routes`}
        text={"Network Route(s)"}
        count={row.original.routes_count}
      />
    ),
  },
  {
    accessorKey: "nameservers_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-xs normal-case"}>Nameservers</div>}
        >
          <DNSIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<DNSIcon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=nameservers`}
        text={"Nameserver(s)"}
        count={row.original.nameservers_count}
      />
    ),
  },
  {
    accessorKey: "zones_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-xs normal-case"}>Zones</div>}
        >
          <DNSZoneIcon size={16} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<DNSZoneIcon size={14} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=zones`}
        text={"Zone(s)"}
        count={row.original.zones_count}
      />
    ),
  },
  {
    accessorKey: "setup_keys_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          center={true}
          tooltip={<div className={"text-xs normal-case"}>Setup Keys</div>}
        >
          <SetupKeysIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<SetupKeysIcon size={10} />}
        groupName={row.original.name}
        href={`/group?id=${row.original.id}&tab=setup-keys`}
        hidden={row.original.name === "All"}
        text={"Setup Key(s)"}
        count={row.original.setup_keys_count}
      />
    ),
  },
  {
    id: "in_use",
    header: ({ column }) => {
      return <DataTableHeader column={column}>In Use</DataTableHeader>;
    },
    sortingFn: "basic",
    accessorFn: (row) => {
      return (
        row.peers_count > 0 ||
        row.nameservers_count > 0 ||
        row.policies_count > 0 ||
        row.routes_count > 0 ||
        row.setup_keys_count > 0 ||
        row.users_count > 0 ||
        row.resources_count > 0 ||
        row.zones_count > 0
      );
    },
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => (
      <GroupProvider group={row.original} isDetailPage={false}>
        <GroupsActionCell group={row.original} inUse={row.getValue("in_use")} />
      </GroupProvider>
    ),
  },
  {
    accessorKey: "search",
    accessorFn: (row) => removeAllSpaces(row.name),
    filterFn: "fuzzy",
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function GroupsTable({ headingTarget }: Readonly<Props>) {
  const { data: groups, isLoading } = useGroupsUsage();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "in_use",
        desc: true,
      },
      {
        id: "name",
        desc: false,
      },
    ],
  );

  const usageOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All" },
      { value: true, label: "Used" },
      { value: false, label: "Unused" },
    ],
    [],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "in_use",
        label: "Usage",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={usageOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, usageOptions),
      },
    ],
    [usageOptions],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      text={"Groups"}
      sorting={sorting}
      isLoading={isLoading}
      setSorting={setSorting}
      columns={GroupsTableColumns}
      data={groups}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={"Search group by name..."}
      rightSide={() => <AddGroupButton />}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{
        in_use: false,
        search: false,
      }}
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={groups?.length == 0}
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
