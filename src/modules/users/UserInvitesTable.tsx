import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { isNetBirdHosted } from "@utils/netbird";
import dayjs from "dayjs";
import { ExternalLinkIcon, Link2, MailPlus, User2 } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn, generateColorFromString } from "@utils/helpers";
import { Group } from "@/interfaces/Group";
import { User, UserInviteListItem } from "@/interfaces/User";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import UserActionCell from "@/modules/users/table-cells/UserActionCell";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserGroupCell from "@/modules/users/table-cells/UserGroupCell";
import UserRoleCell from "@/modules/users/table-cells/UserRoleCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import UserInviteModal from "@/modules/users/UserInviteModal";
import { useAccount } from "@/modules/account/useAccount";

// Name cell for invites - same styling as UserNameCell but for invites
function InviteNameCell({ invite }: { invite: UserInviteListItem }) {
  return (
    <div
      className={cn("flex gap-4 px-2 py-1 items-center")}
      data-cy={"invite-name-cell"}
    >
      <div
        className={
          "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{
          color: generateColorFromString(invite.name || invite.email),
        }}
      >
        {invite?.name?.charAt(0) || invite?.email?.charAt(0)}
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {invite.name}
        </span>
        <span className={cn("text-sm text-nb-gray-400")}>{invite.email}</span>
      </div>
    </div>
  );
}

export const InvitesTableColumns: ColumnDef<UserInviteListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    accessorFn: (row) => row.name + " " + row.email,
    sortingFn: "text",
    cell: ({ row }) => <InviteNameCell invite={row.original} />,
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Role</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserRoleCell user={row.original as unknown as User} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Status</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserStatusCell user={row.original as unknown as User} />,
  },
  {
    accessorKey: "auto_groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserGroupCell user={row.original as unknown as User} />,
  },
  {
    accessorKey: "is_blocked",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Block User</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <UserBlockCell user={row.original as unknown as User} />,
  },
  {
    accessorKey: "last_login",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last Login</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <LastTimeRow
        date={dayjs(row.original.expires_at).toDate()}
        text={"Last login on"}
      />
    ),
  },
  {
    accessorKey: "id",
    header: "",
    sortingFn: "text",
    cell: ({ row }) => <UserActionCell user={row.original as unknown as User} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
  onShowUsers?: () => void;
};

export default function UserInvitesTable({
  headingTarget,
  onShowUsers,
}: Readonly<Props>) {
  useFetchApi("/groups");
  const { data: invites, isLoading } = useFetchApi<UserInviteListItem[]>("/users/invites");
  const { mutate } = useSWRConfig();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-invites" + path,
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

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Invites"}
      sorting={sorting}
      setSorting={setSorting}
      columns={InvitesTableColumns}
      data={invites}
      searchPlaceholder={"Search by name or email..."}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<Link2 className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"No Pending Invites"}
          description={
            "There are no pending invites. Create an invite to add users to your network."
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
          show={invites && invites?.length > 0}
          className={"ml-auto"}
        />
      )}
    >
      {(table) => {
        return (
          <>
            <DataTableRowsPerPage table={table} disabled={invites?.length == 0} />
            <DataTableRefreshButton
              isDisabled={invites?.length == 0}
              onClick={() => {
                mutate("/users/invites");
              }}
            />
            <Button variant={"secondary"} onClick={onShowUsers}>
              <User2 size={14} />
              Show Users
            </Button>
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

  if (!isCloud && !embeddedIdpEnabled) return null;

  return (
    <UserInviteModal groups={groups}>
      <Button
        variant={"primary"}
        className={className}
        disabled={!permission.users.create}
      >
        <MailPlus size={16} />
        {isCloud ? "Invite User" : "Add User"}
      </Button>
    </UserInviteModal>
  );
};

