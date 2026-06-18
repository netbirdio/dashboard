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
import { useTranslations } from 'next-intl';
import { usePathname } from "next/navigation";
import { useMemo } from "react";
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

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function GroupsTable({ headingTarget }: Readonly<Props>) {
  const t = useTranslations('groups');
  const tTable = useTranslations('table');
  const tCommon = useTranslations('common');
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
      { value: undefined, label: tCommon('all') },
      { value: true, label: t('used') },
      { value: false, label: t('unused') },
    ],
    [t, tCommon],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "in_use",
        label: t('usage'),
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
    [usageOptions, t],
  );

  const columns = useMemo<ColumnDef<GroupUsage>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t('name')}</DataTableHeader>;
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
            tooltip={<div className={"text-xs normal-case"}>{t('users')}</div>}
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
          text={tTable('rows')}
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
            tooltip={<div className={"text-xs normal-case"}>{t('peers')}</div>}
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
          text={tTable('rows')}
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
            tooltip={<div className={"text-xs normal-case"}>{tTable('of')}</div>}
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
          text={t('policies')}
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
              <div className={"text-xs normal-case"}>{t('resources')}</div>
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
          text={t('resources')}
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
            tooltip={<div className={"text-xs normal-case"}>{t('routes')}</div>}
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
          text={t('routes')}
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
            tooltip={<div className={"text-xs normal-case"}>{t('nameservers')}</div>}
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
          text={t('nameservers')}
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
            tooltip={<div className={"text-xs normal-case"}>{t('zones')}</div>}
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
          text={t('zones')}
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
            tooltip={<div className={"text-xs normal-case"}>{t('setupKeys')}</div>}
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
          text={t('setupKeys')}
          count={row.original.setup_keys_count}
        />
      ),
    },
    {
      id: "in_use",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t('inUse')}</DataTableHeader>;
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
  ], [t, tTable]);

  return (
    <DataTable
      headingTarget={headingTarget}
      text={t('title')}
      sorting={sorting}
      isLoading={isLoading}
      setSorting={setSorting}
      columns={columns}
      data={groups}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={t('searchPlaceholder')}
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
