import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  CheckboxListPicker,
  CheckboxOption,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
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
import GetStartedTest from "@components/ui/GetStartedTest";
import { IconSettings2 } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { T, useTranslation } from "@/i18n/useTranslation";
import { User } from "@/interfaces/User";
import ServiceUserModal from "@/modules/users/ServiceUserModal";
import ServiceUserNameCell from "@/modules/users/table-cells/ServiceUserNameCell";
import UserActionCell from "@/modules/users/table-cells/UserActionCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";

export const ServiceUsersTableColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>
          <T>{"Name"}</T>
        </DataTableHeader>
      );
    },
    sortingFn: "text",
    cell: ({ row }) => <ServiceUserNameCell user={row.original} />,
  },
  {
    accessorKey: "is_current",
    sortingFn: "basic",
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>
          <T>{"Role"}</T>
        </DataTableHeader>
      );
    },
    sortingFn: "text",
    cell: ({ row }) => <UserRoleCell user={row.original} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>
          <T>{"Status"}</T>
        </DataTableHeader>
      );
    },
    sortingFn: "text",
    cell: ({ row }) => <UserStatusCell user={row.original} />,
  },
  {
    id: "role_filter",
    accessorFn: (u) => [u?.role],
    filterFn: "arrIncludesSome",
  },
  {
    accessorKey: "id",
    header: "",
    sortingFn: "text",
    cell: ({ row }) => (
      <UserActionCell user={row.original} serviceUser={true} />
    ),
  },
];

type Props = {
  users?: User[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function ServiceUsersTable({
  users,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { t } = useTranslation();
  useFetchApi("/groups");
  const { mutate } = useSWRConfig();
  const router = useRouter();
  const path = usePathname();
  const { permission } = usePermissions();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "is_current",
        desc: true,
      },
      {
        id: "name",
        desc: true,
      },
    ],
  );

  const statusOptions = useMemo<RadioOption<string | undefined>[]>(
    () => [
      { value: undefined, label: t("All"), dotClass: "bg-nb-gray-500" },
      { value: "active", label: t("Active"), dotClass: "bg-green-500" },
      { value: "blocked", label: t("Blocked"), dotClass: "bg-red-500" },
    ],
    [t],
  );

  const roleOptions = useMemo<CheckboxOption<string>[]>(
    () => [
      { value: "admin", label: t("Admin") },
      { value: "user", label: t("User") },
      { value: "network_admin", label: t("Network Admin") },
      { value: "billing_admin", label: t("Billing Admin") },
      { value: "auditor", label: t("Auditor") },
    ],
    [t],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "status",
        label: t("Status"),
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as string | undefined}
            onChange={p.onChange}
            close={p.close}
            options={statusOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as string | undefined, statusOptions),
      },
      {
        id: "role_filter",
        label: t("Role"),
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            options={roleOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(v as string[] | undefined, roleOptions, "roles"),
      },
    ],
    [t, statusOptions, roleOptions],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={t("Service Users")}
      sorting={sorting}
      setSorting={setSorting}
      columns={ServiceUsersTableColumns}
      data={users}
      onRowClick={(row) => {
        router.push(`/team/user?id=${row.original.id}&service_user=true`);
      }}
      rowClassName={"cursor-pointer"}
      initialPageSize={25}
      showResetFilterButton={false}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{
        is_current: false,
        role_filter: false,
      }}
      searchPlaceholder={t("Search by name or role...")}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<IconSettings2 size={24} className={"text-nb-gray-200"} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={t("Create Service User")}
          description={t(
            "It looks like you don't have any service users. Get started by creating a service user.",
          )}
          button={
            <div className={"flex flex-col"}>
              <div>
                <ServiceUserModal>
                  <Button
                    variant={"primary"}
                    className={""}
                    data-testid={"open-service-user-modal"}
                    disabled={!permission.users.create}
                  >
                    <PlusCircle size={16} />
                    <T>{"Create Service User"}</T>
                  </Button>
                </ServiceUserModal>
              </div>
            </div>
          }
          learnMore={
            <>
              <T>{"Learn more about"}</T>
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/access-netbird-public-api"
                }
                target={"_blank"}
              >
                <T>{"Service Users"}</T>
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => (
        <>
          {users && users?.length > 0 && (
            <ServiceUserModal>
              <Button
                variant={"primary"}
                className={"ml-auto"}
                data-testid={"open-service-user-modal"}
                disabled={!permission.users.create}
              >
                <PlusCircle size={16} />
                <T>{"Create Service User"}</T>
              </Button>
            </ServiceUserModal>
          )}
        </>
      )}
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={users?.length == 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
            }}
          />
          <DataTableRefreshButton
            isDisabled={users?.length == 0}
            onClick={() => {
              mutate("/users?service_user=true");
              mutate("/groups");
            }}
          />
        </>
      )}
    </DataTable>
  );
}
