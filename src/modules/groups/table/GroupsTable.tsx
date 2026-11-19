import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
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
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import { removeAllSpaces } from "@utils/helpers";
import { Layers3Icon } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import DNSIcon from "@/assets/icons/DNSIcon";
import DNSZoneIcon from "@/assets/icons/DNSZoneIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { AddGroupButton } from "@/components/ui/AddGroupButton";
import { GroupProvider } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTranslations } from "@/i18n/LocaleProvider";
import { GroupsMultiSelect } from "@/modules/groups/GroupsMultiSelect";
import GroupsActionCell from "@/modules/groups/table/GroupsActionCell";
import GroupsCountCell from "@/modules/groups/table/GroupsCountCell";
import GroupsNameCell from "@/modules/groups/table/GroupsNameCell";
import useGroupsUsage, {
  canDeleteGroup,
  groupDeleteDisabledReason,
  GroupUsage,
  isGroupInUse,
} from "@/modules/groups/useGroupsUsage";

function createGroupsColumns(
  t: ReturnType<typeof useTranslations>,
): ColumnDef<GroupUsage>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            disabled={
              !table.getRowModel().rows.some((row) => row.getCanSelect())
            }
            aria-label={t("groups.selectAllOnPage")}
          />
        </div>
      ),
      cell: ({ row }) => {
        const canSelect = row.getCanSelect();
        const disabledReason = groupDeleteDisabledReason(row.original, t);
        return (
          <div className={"min-w-[20px] max-w-[20px]"}>
            <FullTooltip
              content={
                <div className={"text-xs max-w-xs"}>{disabledReason}</div>
              }
              interactive={false}
              disabled={canSelect || !disabledReason}
            >
              <Checkbox
                checked={row.getIsSelected() && canSelect}
                variant={"tableCell"}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                disabled={!canSelect}
                aria-label={t("groups.selectGroup", {
                  name: row.original.name,
                })}
              />
            </FullTooltip>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>{t("common.name")}</DataTableHeader>
        );
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
            tooltip={
              <div className={"text-xs normal-case"}>{t("common.users")}</div>
            }
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
          text={t("groups.countUsers")}
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
            tooltip={
              <div className={"text-xs normal-case"}>{t("common.peers")}</div>
            }
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
          text={t("groups.countPeers")}
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
            tooltip={
              <div className={"text-xs normal-case"}>
                {t("common.policies")}
              </div>
            }
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
              ? t("groups.countPolicy")
              : t("groups.countPolicies")
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
                {t("groups.networkResources")}
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
          text={t("groups.countResources")}
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
                {t("common.networkRoutes")}
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
          text={t("groups.countRoutes")}
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
            tooltip={
              <div className={"text-xs normal-case"}>
                {t("common.nameservers")}
              </div>
            }
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
          text={t("groups.countNameservers")}
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
            tooltip={
              <div className={"text-xs normal-case"}>{t("common.zones")}</div>
            }
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
          text={t("groups.countZones")}
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
            tooltip={
              <div className={"text-xs normal-case"}>
                {t("common.setupKeys")}
              </div>
            }
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
          text={t("groups.countSetupKeys")}
          count={row.original.setup_keys_count}
        />
      ),
    },
    {
      id: "in_use",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>{t("groups.inUse")}</DataTableHeader>
        );
      },
      sortingFn: "basic",
      accessorFn: isGroupInUse,
    },
    {
      accessorKey: "id",
      header: "",
      cell: ({ row }) => (
        <GroupProvider group={row.original} isDetailPage={false}>
          <GroupsActionCell
            group={row.original}
            inUse={row.getValue("in_use")}
          />
        </GroupProvider>
      ),
    },
    {
      accessorKey: "search",
      accessorFn: (row) => removeAllSpaces(row.name),
      filterFn: "fuzzy",
    },
  ];
}

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function GroupsTable({ headingTarget }: Readonly<Props>) {
  const t = useTranslations();
  const columns = useMemo(() => createGroupsColumns(t), [t]);
  const { data: groups, isLoading } = useGroupsUsage();
  const { permission } = usePermissions();
  const path = usePathname();
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});

  const selectedGroups = useMemo(
    () =>
      groups?.filter(
        (group) =>
          canDeleteGroup(group, t) && group.id && selectedRows[group.id],
      ) ?? [],
    [groups, selectedRows, t],
  );

  // Drop selections whose group has been deleted or has picked up a dependency
  // since it was checked, so a group can never silently re-enter the batch when
  // it becomes deletable again. Returning `prev` untouched matters: `groups` is
  // recomputed from seven endpoints, so this runs on every revalidation.
  useEffect(() => {
    setSelectedRows((prev) => {
      const selectedIds = Object.keys(prev);
      if (selectedIds.length === 0) return prev;
      const deletableIds = new Set(
        groups?.filter((group) => canDeleteGroup(group, t)).map((group) => group.id),
      );
      const remaining = selectedIds.filter((id) => deletableIds.has(id));
      if (remaining.length === selectedIds.length) return prev;
      return Object.fromEntries(remaining.map((id) => [id, prev[id]]));
    });
  }, [groups, t]);

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
      { value: undefined, id: "all", label: t("common.all") },
      { value: true, id: "used", label: t("groups.used") },
      { value: false, id: "unused", label: t("groups.unused") },
    ],
    [t],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "in_use",
        label: t("groups.usage"),
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
    [t, usageOptions],
  );

  return (
    <>
      <GroupsMultiSelect
        selectedGroups={selectedGroups}
        onCanceled={() => setSelectedRows({})}
      />
      <DataTable
        headingTarget={headingTarget}
        rowSelection={selectedRows}
        setRowSelection={setSelectedRows}
        enableRowSelection={(row) =>
          !!permission.groups.delete && canDeleteGroup(row.original, t)
        }
        useRowId={true}
        resetRowSelectionOnFilter={true}
        text={t("common.groups")}
        sorting={sorting}
        isLoading={isLoading}
        setSorting={setSorting}
        columns={columns}
        data={groups}
        initialPageSize={25}
        showResetFilterButton={false}
        searchPlaceholder={t("groups.searchByName")}
        rightSide={() => <AddGroupButton />}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
        columnVisibility={{
          select: !!permission.groups.delete,
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
                setSelectedRows({});
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
