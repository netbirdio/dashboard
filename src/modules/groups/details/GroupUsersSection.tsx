import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import FullTooltip from "@components/FullTooltip";
import DataTableHeader from "@components/table/DataTableHeader";
import { DataTableMultiSelectPopup } from "@components/table/DataTableMultiSelectPopup";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { MinusCircle, PlusCircle } from "lucide-react";
import React, { lazy, useState } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { useGroupContext } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { User } from "@/interfaces/User";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import { AssignUserToGroupModal } from "@/modules/groups/AssignUserToGroupModal";
import { GroupUsersRemoveCell } from "@/modules/groups/details/GroupDetailsRemoveCell";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserNameCell from "@/modules/users/table-cells/UserNameCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import { InviteUserButton } from "@/modules/users/UsersTable";

const UsersTable = lazy(() => import("@/modules/users/UsersTable"));

export function useGroupUsersTableColumns(): ColumnDef<User>[] {
  const t = useTranslations();
  return [
  {
    id: "select",
    header: ({ table }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label={t("tables.selectAll")}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={row.getIsSelected()}
          variant={"tableCell"}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("tables.selectRow")}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column} labelId="common.name" />
      );
    },
    accessorFn: (row) => row.name + " " + row.email,
    sortingFn: "text",
    cell: ({ row }) => <UserNameCell user={row.original} />,
  },
  {
    accessorKey: "is_current",
    sortingFn: "basic",
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column} labelId="common.role" />
      );
    },
    sortingFn: "text",
    cell: ({ row }) => <UserRoleCell user={row.original} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column} labelId="common.status" />
      );
    },
    sortingFn: "text",
    cell: ({ row }) => <UserStatusCell user={row.original} />,
  },
  {
    accessorKey: "is_blocked",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column} labelId="team.blockUser" />
      );
    },
    sortingFn: "text",
    cell: ({ row }) => <UserBlockCell user={row.original} />,
  },
  {
    accessorKey: "last_login",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column} labelId="tables.lastLogin" />
      );
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <LastTimeRow
        date={dayjs(row.original.last_login).toDate()}
        textId="tables.lastLoginOn"
      />
    ),
  },
  {
    id: "approval_required",
    accessorKey: "approval_required",
    sortingFn: "basic",
    accessorFn: (u) => u?.pending_approval,
  },
  {
    id: "remove_from_group",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <GroupUsersRemoveCell user={row.original} />,
  },
];
}

type Props = {
  users?: User[];
  isLoading?: boolean;
};

export const GroupUsersSection = ({ users, isLoading = true }: Props) => {
  const t = useTranslations();
  const columns = useGroupUsersTableColumns();
  const { group, addUsersToGroup, removeUsersFromGroup } = useGroupContext();
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [open, setOpen] = useState(false);
  const { permission } = usePermissions();

  return (
    <GroupDetailsTableContainer>
      <UsersTable
        isLoading={isLoading}
        columns={columns}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onRowClick={(row) => row.toggleSelected()}
        keepStateInLocalStorage={false}
        minimal={true}
        users={users}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={t("groups.noAssignedUsersTitle")}
            description={t("groups.noAssignedUsersDescription")}
            icon={<TeamIcon size={20} className={"fill-nb-gray-300"} />}
          >
            {permission?.users?.update && (
              <div className={"flex gap-4 items-center justify-center mt-4"}>
                <Button
                  variant={"secondary"}
                  size={"sm"}
                  onClick={() => setOpen(true)}
                >
                  <PlusCircle size={16} />
                  {t("groups.assignUsers")}
                </Button>
                <InviteUserButton show={true} groups={[group]} />
              </div>
            )}
          </NoResults>
        }
        rightSide={(table) => {
          return (
            <>
              <DataTableMultiSelectPopup
                label={t("groups.usersSelected")}
                selectedItems={table
                  .getSelectedRowModel()
                  .rows.map((row) => row.original)}
                onCanceled={() => setSelectedRows({})}
                rightSide={
                  <>
                    <FullTooltip
                      content={
                        <span className={"text-xs"}>
                          {t("groups.removeUsersFromGroup")}
                        </span>
                      }
                    >
                      <Button
                        variant={"default-outline"}
                        size={"xs"}
                        className={"!h-9 !w-9"}
                        onClick={() => {
                          let usersToRemove = table
                            .getSelectedRowModel()
                            .rows.map((row) => row.original);
                          removeUsersFromGroup(usersToRemove).then();
                          setSelectedRows({});
                        }}
                      >
                        <MinusCircle size={16} className={"shrink-0"} />
                      </Button>
                    </FullTooltip>
                  </>
                }
              />
              <AssignUserToGroupModal
                group={group}
                open={open}
                setOpen={setOpen}
                showClose={false}
                excludedUsers={users}
                onSuccess={(newUsers) => {
                  addUsersToGroup(newUsers).then();
                }}
              />
              {users && users?.length > 0 && permission?.users?.update && (
                <div
                  className={"flex gap-4 items-center justify-center ml-auto"}
                >
                  <Button
                    variant={"secondary"}
                    size={"sm"}
                    onClick={() => setOpen(true)}
                  >
                    <PlusCircle size={16} />
                    {t("groups.assignUsers")}
                  </Button>
                  <InviteUserButton show={true} groups={[group]} />
                </div>
              )}
            </>
          );
        }}
      />
    </GroupDetailsTableContainer>
  );
};
