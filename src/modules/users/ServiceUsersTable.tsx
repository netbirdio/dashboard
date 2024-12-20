import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { IconSettings2 } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
      return <DataTableHeader column={column}>Name</DataTableHeader>;
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
}: Props) {
  useFetchApi("/groups");
  const { mutate } = useSWRConfig();
  const router = useRouter();
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

  return (
    <>
      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Service Users"}
        sorting={sorting}
        setSorting={setSorting}
        columns={ServiceUsersTableColumns}
        data={users}
        onRowClick={(row) => {
          router.push(`/team/user?id=${row.original.id}&service_user=true`);
        }}
        rowClassName={"cursor-pointer"}
        columnVisibility={{
          is_current: false,
        }}
        searchPlaceholder={"Search by name or role..."}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<IconSettings2 size={24} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create Service User"}
            description={
              "It looks like you don't have any service users. Get started by creating a service user."
            }
            button={
              <div className={"flex flex-col"}>
                <div>
                  <ServiceUserModal>
                    <Button
                      variant={"primary"}
                      className={""}
                      data-cy={"open-service-user-modal"}
                    >
                      <PlusCircle size={16} />
                      Create Service User
                    </Button>
                  </ServiceUserModal>
                </div>
              </div>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/access-netbird-public-api"
                  }
                  target={"_blank"}
                >
                  Service Users
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
                  data-cy={"open-service-user-modal"}
                >
                  <PlusCircle size={16} />
                  Create Service User
                </Button>
              </ServiceUserModal>
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
                mutate("/users?service_user=true");
                mutate("/groups");
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
