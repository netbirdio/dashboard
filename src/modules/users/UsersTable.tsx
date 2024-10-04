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
import { isLocalDev, isNetBirdHosted } from "@utils/netbird";
import dayjs from "dayjs";
import { ExternalLinkIcon, MailPlus, PlusCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import TeamIcon from "@/assets/icons/TeamIcon";
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

export default function UsersTable({ users, isLoading, headingTarget }: Props) {
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

  return (
    <>
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
            title={"Create Nameserver"}
            description={
              "It looks like you don't have any nameservers. Get started by adding one to your network. Select a predefined or add your custom nameservers."
            }
            button={
              <div className={"flex flex-col"}>
                <div>
                  <Button variant={"primary"} className={""}>
                    <PlusCircle size={16} />
                    Add Nameserver
                  </Button>
                </div>
              </div>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/manage-dns-in-your-network"
                  }
                  target={"_blank"}
                >
                  DNS
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() => (
          <>
            {(isLocalDev() || isNetBirdHosted()) &&
              users &&
              users?.length > 0 && (
                <UserInviteModal>
                  <Button variant={"primary"} className={"ml-auto"}>
                    <MailPlus size={16} />
                    Invite User
                  </Button>
                </UserInviteModal>
              )}
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage table={table} disabled={users?.length == 0} />
            <DataTableRefreshButton
              isDisabled={users?.length == 0}
              onClick={() => {
                mutate("/users?service_user=false");
                mutate("/groups");
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
