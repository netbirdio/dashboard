import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { Modal, ModalContent } from "@components/modal/Modal";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResultsCard from "@components/ui/NoResultsCard";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import * as React from "react";
import { useMemo, useState } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { DataTable } from "@/components/table/DataTable";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import UserNameCell from "@/modules/users/table-cells/UserNameCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";

type Props = {
  group: Group;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: (users: User[]) => void;
  excludedUsers?: User[];
  showClose?: boolean;
  buttonText?: string;
};

export const AssignUserToGroupModal = ({
  group,
  open = false,
  setOpen,
  onSuccess,
  excludedUsers,
  showClose,
  buttonText,
}: Props) => {
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? "1" : "0"}>
      {open && (
        <AssignUserToGroupModalContent
          group={group}
          onSuccess={(users) => {
            setOpen(false);
            onSuccess?.(users);
          }}
          excludedUsers={excludedUsers}
          showClose={showClose}
          buttonText={buttonText}
        />
      )}
    </Modal>
  );
};

type ContentProps = {
  group: Group;
  onSuccess?: (users: User[]) => void;
  excludedUsers?: User[];
  showClose?: boolean;
  buttonText?: string;
};

export const AssignUserToGroupModalContent = ({
  group,
  onSuccess,
  excludedUsers,
  showClose = true,
  buttonText,
}: ContentProps) => {
  const { t } = useI18n();
  const columns = useUsersTableColumns();
  const { data: users, isLoading } = useFetchApi<User[]>(
    "/users?service_user=false",
  );
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const isAllGroup = group.name === "All";
  const [sorting, setSorting] = useState([
    {
      id: "name",
      desc: false,
    },
  ]);

  const data = useMemo(() => {
    return users?.filter((p) => {
      if (!excludedUsers || excludedUsers.length === 0) return true;
      return !excludedUsers.find((ep) => ep.id === p.id);
    });
  }, [users, excludedUsers]);

  return (
    <ModalContent
      maxWidthClass={"max-w-4xl"}
      className={cn(users && users.length > 0 ? "pb-0" : "pb-8")}
      showClose={showClose}
    >
      <DataTable
        useRowId={true}
        rowSelection={selectedRows}
        setRowSelection={setSelectedRows}
        onRowClick={(row) => row.toggleSelected()}
        text={t("users.title")}
        resetRowSelectionOnSearch={false}
        uniqueKey={group?.id ?? group?.name}
        sorting={sorting}
        keepStateInLocalStorage={false}
        setSorting={setSorting}
        columns={columns}
        data={data}
        isLoading={isLoading}
        tableCellClassName={"!py-1 scale-[95%]"}
        searchPlaceholder={t("groupUsers.searchPlaceholder")}
        searchClassName={"w-[350px]"}
        minimal={false}
        columnVisibility={{}}
        getStartedCard={
          <NoResultsCard
            className={"mb-8"}
            title={t("groupUsers.emptyAssignTitle")}
            description={t("groupUsers.emptyAssignDescription")}
            icon={<TeamIcon className={"fill-nb-gray-200"} size={14} />}
          />
        }
        rightSide={(table) => (
          <div className={"ml-auto flex items-center gap-5"}>
            <div className={"text-sm"}>
              {Object.keys(selectedRows).length > 0 && (
                <div className={"text-nb-gray-200"}>
                    <span className={"text-netbird font-medium"}>
                      {Object.keys(selectedRows).length}
                    </span>{" "}
                    {t("groupUsers.selected", {
                      count: Object.keys(selectedRows).length,
                    })}
                  </div>
                )}
            </div>
            {!isAllGroup && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                disabled={
                  users?.length === 0 || Object.keys(selectedRows).length === 0
                }
                onClick={() => {
                  const selectedUsers = table
                    .getSelectedRowModel()
                    .rows.map((row) => row.original);
                  onSuccess?.(selectedUsers);
                }}
              >
                {buttonText ?? t("groupUsers.assignUsers")}
              </Button>
            )}
          </div>
        )}
      />
    </ModalContent>
  );
};

function useUsersTableColumns(): ColumnDef<User>[] {
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
      accessorKey: "last_login",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>{t("table.lastLogin")}</DataTableHeader>
        );
      },
      sortingFn: "text",
      cell: ({ row }) => (
        <LastTimeRow
          date={dayjs(row.original.last_login).toDate()}
          text={t("groupUsers.lastLoginOn")}
        />
      ),
    },
  ];
}
