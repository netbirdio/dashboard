import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { isLocalDev, isNetBirdHosted } from "@utils/netbird";
import dayjs from "dayjs";
import { ExternalLinkIcon, MailPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { User } from "@/interfaces/User";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import UserActionCell from "@/modules/users/table-cells/UserActionCell";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserGroupCell from "@/modules/users/table-cells/UserGroupCell";
import UserNameCell from "@/modules/users/table-cells/UserNameCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import UserInviteModal from "@/modules/users/UserInviteModal";

export const UsersTableColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
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
      return <DataTableHeader column={column}>Role</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserRoleCell user={row.original} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Status</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserStatusCell user={row.original} />,
  },

  {
    accessorKey: "auto_groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserGroupCell user={row.original} />,
  },

  {
    accessorKey: "is_blocked",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Block User</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserBlockCell user={row.original} />,
  },
  {
    accessorKey: "last_login",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last Login</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <LastTimeRow
        date={dayjs(row.original.last_login).toDate()}
        text={"Last login on"}
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
    accessorKey: "id",
    header: "",
    sortingFn: "text",
    cell: ({ row }) => <UserActionCell user={row.original} />,
  },
];

type Props = {
  users?: User[];
  isLoading?: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function UsersTable({
  users,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  useFetchApi("/groups");
  const { mutate } = useSWRConfig();
  const path = usePathname();

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

  const router = useRouter();
  const pendingApprovalCount =
    users?.filter((u) => u.pending_approval).length || 0;

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Users"}
      sorting={sorting}
      setSorting={setSorting}
      columns={UsersTableColumns}
      data={users}
      columnVisibility={{
        is_current: false,
        approval_required: false,
      }}
      onRowClick={(row) => {
        router.push(`/team/user?id=${row.original.id}`);
      }}
      searchPlaceholder={"Search by name, email or role..."}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<TeamIcon className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Add New Users"}
          description={
            "It looks like you don't have any users yet. Get started by inviting users to your account."
          }
          button={
            <div className={"flex flex-col items-center justify-center"}>
              <InviteUserButton show={true} />
            </div>
          }
          learnMore={
            <>
              Learn more about
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/add-users-to-your-network"
                }
                target={"_blank"}
              >
                Users
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => (
        <InviteUserButton
          show={users && users?.length > 0}
          className={"ml-auto"}
        />
      )}
    >
      {(table) => {
        if (
          pendingApprovalCount == 0 &&
          table.getColumn("approval_required")?.getFilterValue() === true
        ) {
          table.setColumnFilters([]);
        }

        return (
          <>
            {pendingApprovalCount > 0 && (
              <Button
                disabled={users?.length == 0}
                onClick={() => {
                  table.setPageIndex(0);
                  let current =
                    table.getColumn("approval_required")?.getFilterValue() ===
                    undefined
                      ? true
                      : undefined;

                  table.setColumnFilters([
                    {
                      id: "approval_required",
                      value: current,
                    },
                  ]);
                }}
                variant={
                  table.getColumn("approval_required")?.getFilterValue() ===
                  true
                    ? "tertiary"
                    : "secondary"
                }
              >
                Pending Approvals
                <NotificationCountBadge count={pendingApprovalCount} />
              </Button>
            )}
            <DataTableRowsPerPage table={table} disabled={users?.length == 0} />
            <DataTableRefreshButton
              isDisabled={users?.length == 0}
              onClick={() => {
                mutate("/users?service_user=false");
                mutate("/groups");
              }}
            />
          </>
        );
      }}
    </DataTable>
  );
}

type InviteUserButtonProps = {
  show?: boolean;
  className?: string;
};

const InviteUserButton = ({
  show = false,
  className,
}: InviteUserButtonProps) => {
  const { permission } = usePermissions();
  if (!show) return null;

  return (
    (isLocalDev() || isNetBirdHosted()) && (
      <UserInviteModal>
        <Button
          variant={"primary"}
          className={className}
          disabled={!permission.users.create}
        >
          <MailPlus size={16} />
          Invite User
        </Button>
      </UserInviteModal>
    )
  );
};
