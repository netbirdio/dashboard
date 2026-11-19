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
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { User } from "@/interfaces/User";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";
import { PeerOSCell } from "@/modules/peers/PeerOSCell";
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
  const translate = useTranslations();
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
  const columns = useUsersTableColumns();
  const assignLabel = buttonText ?? translate("groups.assignUsers");

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
        text={translate("common.users")}
        resetRowSelectionOnSearch={false}
        uniqueKey={group?.id ?? group?.name}
        sorting={sorting}
        keepStateInLocalStorage={false}
        setSorting={setSorting}
        columns={columns}
        data={data}
        isLoading={isLoading}
        tableCellClassName={"!py-1 scale-[95%]"}
        searchPlaceholder={translate("groups.searchByNameEmailOrRole")}
        searchClassName={"w-[350px]"}
        minimal={false}
        columnVisibility={{}}
        getStartedCard={
          <NoResultsCard
            className={"mb-8"}
            title={translate("groups.noUsersToAssignTitle")}
            description={translate("groups.noUsersToAssignDescription")}
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
                  {translate("groups.usersSelected")}
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
                {assignLabel}
              </Button>
            )}
          </div>
        )}
      />
    </ModalContent>
  );
};

function useUsersTableColumns(): ColumnDef<User>[] {
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
  ];
}
