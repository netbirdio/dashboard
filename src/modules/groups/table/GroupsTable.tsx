"use client";

import ButtonGroup from "@components/ButtonGroup";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { Layers3Icon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { AddGroupButton } from "@/components/ui/AddGroupButton";
import { GroupProvider } from "@/contexts/GroupProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import GroupsActionCell from "@/modules/groups/table/GroupsActionCell";
import GroupsCountCell from "@/modules/groups/table/GroupsCountCell";
import GroupsNameCell from "@/modules/groups/table/GroupsNameCell";
import useGroupsUsage, { GroupUsage } from "@/modules/groups/useGroupsUsage";

function useGroupsTableColumns(): ColumnDef<GroupUsage>[] {
  const { t } = useI18n();

  return useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
        },
        cell: ({ row }) => {
          const inUse = !!row.getValue("in_use");
          return (
            <GroupsNameCell
              active={inUse}
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
              tooltip={<div className={"text-xs normal-case"}>{t("groups.tooltip.users")}</div>}
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
            text={t("groups.count.users")}
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
              tooltip={<div className={"text-xs normal-case"}>{t("groups.tooltip.peers")}</div>}
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
            text={t("groups.count.peers")}
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
              tooltip={<div className={"text-xs normal-case"}>{t("groups.tooltip.policies")}</div>}
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
            text={
              row.original.policies_count === 1
                ? t("groups.count.policy")
                : t("groups.count.policies")
            }
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
                <div className={"text-xs normal-case"}>
                  {t("groups.tooltip.networkResources")}
                </div>
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
            text={t("groups.count.networkResources")}
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
              tooltip={
                <div className={"text-xs normal-case"}>
                  {t("groups.tooltip.networkRoutes")}
                </div>
              }
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
            text={t("groups.count.networkRoutes")}
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
              tooltip={<div className={"text-xs normal-case"}>{t("groups.tooltip.nameservers")}</div>}
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
            text={t("groups.count.nameservers")}
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
              tooltip={<div className={"text-xs normal-case"}>{t("groups.tooltip.zones")}</div>}
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
            text={t("groups.count.zones")}
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
              tooltip={<div className={"text-xs normal-case"}>{t("groups.tooltip.setupKeys")}</div>}
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
            text={t("groups.count.setupKeys")}
            count={row.original.setup_keys_count}
          />
        ),
      },
      {
        id: "in_use",
        header: ({ column }) => {
          return <DataTableHeader column={column}>{t("groups.inUse")}</DataTableHeader>;
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
    ],
    [t],
  );
}

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function GroupsTable({ headingTarget }: Readonly<Props>) {
  const { data: groups, isLoading } = useGroupsUsage();
  const path = usePathname();
  const { t } = useI18n();
  const columns = useGroupsTableColumns();

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

  return (
    <DataTable
      headingTarget={headingTarget}
      text={t("groups.title")}
      sorting={sorting}
      isLoading={isLoading}
      setSorting={setSorting}
      columns={columns}
      data={groups}
      searchPlaceholder={t("groups.searchPlaceholder")}
      rightSide={() => <AddGroupButton />}
      columnVisibility={{
        in_use: false,
        search: false,
      }}
    >
      {(table) => (
        <>
          <ButtonGroup disabled={groups?.length == 0}>
            <ButtonGroup.Button
              onClick={() => table.getColumn("in_use")?.setFilterValue(undefined)}
              disabled={groups?.length == 0}
              variant={
                table.getColumn("in_use")?.getFilterValue() === undefined
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("filters.all")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => table.getColumn("in_use")?.setFilterValue(true)}
              disabled={groups?.length == 0}
              variant={
                table.getColumn("in_use")?.getFilterValue() === true
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("groups.used")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              disabled={groups?.length == 0}
              onClick={() => table.getColumn("in_use")?.setFilterValue(false)}
              variant={
                table.getColumn("in_use")?.getFilterValue() === false
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("groups.unused")}
            </ButtonGroup.Button>
          </ButtonGroup>
          <DataTableRowsPerPage table={table} disabled={groups?.length == 0} />
        </>
      )}
    </DataTable>
  );
}
