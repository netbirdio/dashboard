import ButtonGroup from "@components/ButtonGroup";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { FolderGit2Icon } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import GroupsActionCell from "@/modules/settings/GroupsActionCell";
import GroupsCountCell from "@/modules/settings/GroupsCountCell";
import useGroupsUsage, { GroupUsage } from "@/modules/settings/useGroupsUsage";
import GroupsIPv6Cell from "@/modules/settings/GroupsIPv6Cell";

// Peers, Access Controls, DNS, Routes, Setup Keys, Users
export const GroupsTableColumns: ColumnDef<GroupUsage>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    cell: ({ row }) => {
      const in_use = !!row.getValue("in_use");
      return <ActiveInactiveRow active={in_use} text={row.original.name} />;
    },
    sortingFn: "text",
  },
  {
    accessorKey: "setup_keys_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          center={true}
          tooltip={<div className={"text-sm normal-case"}>Setup Keys</div>}
        >
          <SetupKeysIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<SetupKeysIcon size={10} />}
        groupName={row.original.name}
        text={"Setup Key(s)"}
        count={row.original.setup_keys_count}
      />
    ),
  },
  {
    accessorKey: "peers_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-sm normal-case"}>Peers</div>}
        >
          <PeerIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<PeerIcon size={10} />}
        groupName={row.original.name}
        text={"Peer(s)"}
        count={row.original.peers_count}
      />
    ),
  },
  {
    accessorKey: "nameservers_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-sm normal-case"}>DNS</div>}
        >
          <DNSIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<DNSIcon size={10} />}
        groupName={row.original.name}
        text={"DNS"}
        count={row.original.nameservers_count}
      />
    ),
  },
  {
    accessorKey: "policies_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-sm normal-case"}>Access Controls</div>}
        >
          <AccessControlIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<AccessControlIcon size={10} />}
        groupName={row.original.name}
        text={"Access Control(s)"}
        count={row.original.policies_count}
      />
    ),
  },
  {
    accessorKey: "routes_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-sm normal-case"}>Network Routes</div>}
        >
          <NetworkRoutesIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<NetworkRoutesIcon size={10} />}
        groupName={row.original.name}
        text={"Network Route(s)"}
        count={row.original.routes_count}
      />
    ),
  },
  {
    accessorKey: "users_count",
    header: ({ column }) => {
      return (
        <DataTableHeader
          column={column}
          tooltip={<div className={"text-sm normal-case"}>Users</div>}
        >
          <TeamIcon size={12} />
        </DataTableHeader>
      );
    },
    cell: ({ row }) => (
      <GroupsCountCell
        icon={<TeamIcon size={10} />}
        groupName={row.original.name}
        text={"User(s)"}
        count={row.original.users_count}
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
        row.users_count > 0
      );
    },
  },
  {
    id: "ipv6",
    header: ({ column }) => {
      return <DataTableHeader column={column} className={"text-sm normal-case"}>IPv6</DataTableHeader>;
    },
    accessorFn: row => row.original_group.ipv6_enabled,
    cell: ({ row }) => (
      <GroupsIPv6Cell group={row.original}/>
    ),
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => (
      <GroupsActionCell group={row.original} in_use={row.getValue("in_use")} />
    ),
  },
];

export default function GroupsTable() {
  const groups = useGroupsUsage();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: true,
      },
    ],
  );

  return (
    <>
      {groups && groups.length > 0 ? (
        <DataTable
          showSearch={true}
          text={"Groups"}
          minimal={false}
          inset={false}
          sorting={sorting}
          setSorting={setSorting}
          columns={GroupsTableColumns}
          data={groups}
          searchPlaceholder={"Search group..."}
          columnVisibility={{
            in_use: false,
          }}
        >
          {(table) => (
            <>
              <ButtonGroup disabled={groups?.length == 0}>
                <ButtonGroup.Button
                  onClick={() =>
                    table.getColumn("in_use")?.setFilterValue(undefined)
                  }
                  disabled={groups?.length == 0}
                  variant={
                    table.getColumn("in_use")?.getFilterValue() === undefined
                      ? "tertiary"
                      : "secondary"
                  }
                >
                  All
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  onClick={() =>
                    table.getColumn("in_use")?.setFilterValue(true)
                  }
                  disabled={groups?.length == 0}
                  variant={
                    table.getColumn("in_use")?.getFilterValue() === true
                      ? "tertiary"
                      : "secondary"
                  }
                >
                  Used
                </ButtonGroup.Button>
                <ButtonGroup.Button
                  disabled={groups?.length == 0}
                  onClick={() =>
                    table.getColumn("in_use")?.setFilterValue(false)
                  }
                  variant={
                    table.getColumn("in_use")?.getFilterValue() === false
                      ? "tertiary"
                      : "secondary"
                  }
                >
                  Unused
                </ButtonGroup.Button>
              </ButtonGroup>
              <DataTableRowsPerPage
                table={table}
                disabled={groups?.length == 0}
              />
            </>
          )}
        </DataTable>
      ) : (
        <div className={"py-3 bg-nb-gray-950 overflow-hidden"}>
          <NoResults
            title={"No groups"}
            description={"You don't have any groups created yet."}
            icon={<FolderGit2Icon size={20} className={"fill-nb-gray-300"} />}
          />
        </div>
      )}
    </>
  );
}
