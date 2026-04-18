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
import { useI18n } from "@/i18n/I18nProvider";
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

function getAccessTokensTableColumns(
  t: (key: any, values?: Record<string, string | number>) => string,
): ColumnDef<AccessToken>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.name")}</DataTableHeader>;
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
        return (
          <DataTableHeader column={column}>{t("accessTokens.expires")}</DataTableHeader>
        );
      },
      cell: ({ row }) => (
        <ExpirationDateRow date={row.original.expiration_date} />
      ),
    },
    {
      accessorKey: "last_used",
      header: ({ column }) => {
        return (
          <DataTableHeader column={column}>{t("accessTokens.lastUsed")}</DataTableHeader>
        );
      },
      sortingFn: "datetime",
      cell: ({ row }) => {
        return typeof row.original.last_used === "undefined" ? (
          <EmptyRow />
        ) : (
          <LastTimeRow
            date={row.original.last_used}
            text={t("accessTokens.lastUsedOn")}
          />
        );
      },
    },
    {
      accessorKey: "id",
      header: "",
      cell: ({ row }) => <AccessTokenActionCell access_token={row.original} />,
    },
  ];
}

export default function AccessTokensTable({ user }: Readonly<Props>) {
  const { t } = useI18n();
  const { data: tokens } = useFetchApi<AccessToken[]>(
    `/users/${user.id}/tokens`,
    true,
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
    <UserProvider user={user}>
      <Card className={"mt-5 w-full"}>
        {tokens && tokens.length > 0 ? (
            <DataTable
            text={t("accessTokens.title")}
            tableClassName={"mt-0"}
            minimal={true}
            showSearchAndFilters={false}
            inset={false}
            sorting={sorting}
            setSorting={setSorting}
            columns={getAccessTokensTableColumns(t)}
            data={tokens}
          />
        ) : (
          <div className={"bg-nb-gray-950 overflow-hidden"}>
            <NoResults
              className={"py-3"}
              title={t("accessTokens.emptyTitle")}
              description={t("accessTokens.emptyDescription")}
              icon={<IconApi size={20} className={"fill-nb-gray-300"} />}
            />
          </div>
        )}
      </Card>
    </UserProvider>
  );
}
