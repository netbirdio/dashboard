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
import { useI18n } from "@/i18n/I18nProvider";
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

function useGroupUsersTableColumns(): ColumnDef<User>[] {
  const { t } = useI18n();

  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label={t("groupUsers.selectAll")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className={"min-w-[20px] max-w-[20px]"}>
          <Checkbox
            checked={row.getIsSelected()}
            variant={"tableCell"}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("groupUsers.selectRow")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
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
        return <DataTableHeader column={column}>{t("table.role")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <UserRoleCell user={row.original} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.status")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <UserStatusCell user={row.original} />,
    },
    {
      accessorKey: "is_blocked",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.blockUser")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => <UserBlockCell user={row.original} />,
    },
    {
      accessorKey: "last_login",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.lastLogin")}</DataTableHeader>;
      },
      sortingFn: "text",
      cell: ({ row }) => (
        <LastTimeRow
          date={dayjs(row.original.last_login).toDate()}
          text={t("users.lastLoginOn")}
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
  const { t } = useI18n();
  const { group, addUsersToGroup, removeUsersFromGroup } = useGroupContext();
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [open, setOpen] = useState(false);
  const { permission } = usePermissions();
  const columns = useGroupUsersTableColumns();

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
            title={t("groupUsers.emptyTitle")}
            description={t("groupUsers.emptyDescription")}
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
                  {t("groupUsers.assignUsers")}
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
                label={t("groupUsers.selected")}
                selectedItems={table
                  .getSelectedRowModel()
                  .rows.map((row) => row.original)}
                onCanceled={() => setSelectedRows({})}
                rightSide={
                  <>
                    <FullTooltip
                      content={
                        <span className={"text-xs"}>{t("groupUsers.removeFromGroup")}</span>
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
                    {t("groupUsers.assignUsers")}
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
