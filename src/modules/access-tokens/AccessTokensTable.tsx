import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { IconApi } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { usePathname } from "next/navigation";
import React from "react";
import UserProvider from "@/contexts/UserProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { AccessToken } from "@/interfaces/AccessToken";
import { User } from "@/interfaces/User";
import AccessTokenActionCell from "@/modules/access-tokens/AccessTokenActionCell";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import ExpirationDateRow from "@/modules/common-table-rows/ExpirationDateRow";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import SetupKeyNameCell from "@/modules/setup-keys/SetupKeyNameCell";

type Props = {
  user: User;
};

export const AccessTokensTableColumns: ColumnDef<AccessToken>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => {
      const isValid = dayjs(row.original.expiration_date).isAfter(dayjs());
      return <SetupKeyNameCell name={row.original.name} valid={isValid} />;
    },
  },
  {
    accessorKey: "expiration_date",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Expires</DataTableHeader>;
    },
    cell: ({ row }) => (
      <ExpirationDateRow date={row.original.expiration_date} />
    ),
  },
  {
    accessorKey: "last_used",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last used</DataTableHeader>;
    },
    sortingFn: "datetime",
    cell: ({ row }) => {
      return typeof row.original.last_used === "undefined" ? (
        <EmptyRow />
      ) : (
        <LastTimeRow date={row.original.last_used} text={"Last used on"} />
      );
    },
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <AccessTokenActionCell access_token={row.original} />,
  },
];

export default function AccessTokensTable({ user }: Props) {
  const { data: tokens } = useFetchApi<AccessToken[]>(
    `/users/${user.id}/tokens`,
  );

  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: true,
      },
    ],
  );

  return (
    <>
      <UserProvider user={user}>
        <Card className={"mt-5 w-full"}>
          {tokens && tokens.length > 0 ? (
            <DataTable
              text={"Access Tokens"}
              tableClassName={"mt-0"}
              minimal={true}
              inset={false}
              sorting={sorting}
              setSorting={setSorting}
              columns={AccessTokensTableColumns}
              data={tokens}
            />
          ) : (
            <div className={"py-3 bg-nb-gray-950 overflow-hidden"}>
              <NoResults
                title={"No access tokens"}
                description={
                  "You don't have any access tokens yet. You can add a token to access the NetBird API."
                }
                icon={<IconApi size={20} className={"fill-nb-gray-300"} />}
              />
            </div>
          )}
        </Card>
      </UserProvider>
    </>
  );
}
