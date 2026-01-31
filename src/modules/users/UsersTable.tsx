import Button from "@components/Button";
import Card from "@components/Card";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import {
  ColumnDef,
  Row,
  RowSelectionState,
  SortingState,
  Table,
} from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { isNetBirdHosted } from "@utils/netbird";
import dayjs from "dayjs";
import { ExternalLinkIcon, Link2, MailPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { User, UserInvite } from "@/interfaces/User";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import { PendingApprovalFilter } from "@/modules/users/PendingApprovalFilter";
import UserActionCell from "@/modules/users/table-cells/UserActionCell";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserGroupCell from "@/modules/users/table-cells/UserGroupCell";
import UserNameCell from "@/modules/users/table-cells/UserNameCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import UserInviteModal from "@/modules/users/UserInviteModal";
import UserInvitesTable from "@/modules/users/UserInvitesTable";
import { useAccount } from "@/modules/account/useAccount";

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
  minimal?: boolean;
  rightSide?: (table: Table<User>) => React.ReactNode;
  getStartedCard?: React.ReactNode;
  columns?: ColumnDef<User>[];
  selectedRows?: RowSelectionState;
  setSelectedRows?: (updater: React.SetStateAction<RowSelectionState>) => void;
  onRowClick?: (row: Row<User>) => void;
  keepStateInLocalStorage?: boolean;
};

export default function UsersTable({
  users,
  isLoading,
  headingTarget,
  minimal,
  rightSide,
  getStartedCard,
  columns = UsersTableColumns,
  selectedRows,
  setSelectedRows,
  onRowClick,
  keepStateInLocalStorage = true,
}: Readonly<Props>) {
  useFetchApi("/groups");
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const account = useAccount();

  const isCloud = isNetBirdHosted();
  const embeddedIdpEnabled = account?.settings.embedded_idp_enabled;
  const showInvitesToggle = !isCloud && embeddedIdpEnabled;

  const { data: invites } = useFetchApi<UserInvite[]>(
    "/users/invites",
    false,
    true,
    showInvitesToggle,
  );
  const validInvitesCount = invites?.filter((i) => !i.expired).length ?? 0;

  const [showInvites, setShowInvites] = useState(false);

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
    keepStateInLocalStorage,
  );

  const router = useRouter();
  const { permission } = usePermissions();

  if (showInvites) {
    return (
      <UserInvitesTable
        headingTarget={headingTarget}
        onShowUsers={() => setShowInvites(false)}
      />
    );
  }

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      keepStateInLocalStorage={keepStateInLocalStorage}
      text={"Users"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      wrapperComponent={minimal ? Card : undefined}
      wrapperProps={minimal && { className: "mt-6 w-full" }}
      minimal={minimal}
      data={users}
      rowSelection={selectedRows}
      setRowSelection={setSelectedRows}
      tableClassName={minimal ? "mt-0" : ""}
      columnVisibility={{
        select: permission?.groups?.update,
        is_current: false,
        approval_required: false,
      }}
      onRowClick={
        !onRowClick
          ? (row) => {
              router.push(`/team/user?id=${row.original.id}`);
            }
          : onRowClick
      }
      searchPlaceholder={"Search by name, email or role..."}
      getStartedCard={
        !getStartedCard ? (
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
        ) : (
          getStartedCard
        )
      }
      rightSide={
        !rightSide
          ? () => (
              <InviteUserButton
                show={users && users?.length > 0}
                className={"ml-auto"}
              />
            )
          : rightSide
      }
    >
      {(table) => {
        return (
          <>
            <PendingApprovalFilter
              table={table}
              data={users}
              count={users?.filter((u) => u?.pending_approval)?.length}
            />
            <DataTableRowsPerPage table={table} disabled={users?.length == 0} />
            <DataTableRefreshButton
              isDisabled={users?.length == 0}
              onClick={() => {
                mutate("/users?service_user=false");
                mutate("/groups");
              }}
            />
            {showInvitesToggle && (
              <Button
                variant={"secondary"}
                onClick={() => setShowInvites(true)}
              >
                <Link2 size={14} />
                Show Invites
                <NotificationCountBadge count={validInvitesCount} />
              </Button>
            )}
          </>
        );
      }}
    </DataTable>
  );
}

type InviteUserButtonProps = {
  show?: boolean;
  className?: string;
  groups?: Group[];
};

export const InviteUserButton = ({
  show = false,
  className,
  groups,
}: InviteUserButtonProps) => {
  const { permission } = usePermissions();
  const account = useAccount();

  if (!show) return null;

  // On cloud: always show "Invite User"
  // On self-hosted: only show when embedded_idp_enabled is true
  const isCloud = isNetBirdHosted();
  const embeddedIdpEnabled = account?.settings.embedded_idp_enabled;
  const localAuthDisabled = account?.settings.local_auth_disabled;

  if (!isCloud && !embeddedIdpEnabled) return null;

  const isDisabled = !permission.users.create || localAuthDisabled;

  const button = (
    <Button
      variant={"primary"}
      className={className}
      disabled={isDisabled}
    >
      <MailPlus size={16} />
      {isCloud ? "Invite User" : "Add User"}
    </Button>
  );

  if (localAuthDisabled) {
    return (
      <FullTooltip
        className={className}
        interactive={true}
        content={
          <div className={"flex flex-col"}>
            <p className={"max-w-[200px] text-xs"}>
              Local authentication is disabled. Use your IdP for authentication.
            </p>
            <div className={"text-xs mt-1.5"}>
              <InlineLink
                href={"https://docs.netbird.io/selfhosted/identity-providers/disable-local-authentication"}
                target={"_blank"}
                className={"flex gap-1 items-center"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </div>
          </div>
        }
      >
        {button}
      </FullTooltip>
    );
  }

  return <UserInviteModal groups={groups}>{button}</UserInviteModal>;
};

