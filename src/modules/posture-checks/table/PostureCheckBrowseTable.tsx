import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useI18n } from "@/i18n/I18nProvider";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckChecksCell } from "@/modules/posture-checks/table/cells/PostureCheckChecksCell";
import { PostureCheckNameCell } from "@/modules/posture-checks/table/cells/PostureCheckNameCell";

type Props = {
  onAdd: (checks: PostureCheck[]) => void;
};

export default function PostureCheckBrowseTable({ onAdd }: Readonly<Props>) {
  const { t } = useI18n();
  const { data: postureChecks, isLoading } =
    useFetchApi<PostureCheck[]>("/posture-checks");
  const { mutate } = useSWRConfig();

  // Default sorting state of the table
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "name",
      desc: true,
    },
  ]);

  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});

  return (
    <div className={""}>
      <DataTable
        showResetFilterButton={false}
        rowSelection={selectedRows}
        setRowSelection={setSelectedRows}
        isLoading={isLoading}
        keepStateInLocalStorage={false}
        text={t("postureChecks.title")}
        sorting={sorting}
        wrapperClassName={""}
        setSorting={setSorting}
        columns={getPostureChecksColumns(t)}
        showHeader={true}
        columnVisibility={{
          description: false,
        }}
        tableClassName={"mt-6 !border-0"}
        rowClassName={"!border-b-0 px-10"}
        data={postureChecks}
        searchPlaceholder={t("postureChecks.searchPlaceholder")}
        onRowClick={(row) => row.toggleSelected()}
        rightSide={(table) => (
          <>
            {postureChecks && postureChecks?.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() =>
                  onAdd(
                    table.getSelectedRowModel().rows.map((row) => row.original),
                  )
                }
                disabled={table.getSelectedRowModel().rows.length <= 0}
              >
                {t("postureChecks.addSelected", {
                  count: table.getSelectedRowModel().rows.length,
                })}
              </Button>
            )}
          </>
        )}
      >
        {() => {
          return (
            <DataTableRefreshButton
              isDisabled={postureChecks?.length == 0}
              onClick={() => {
                mutate("/posture-checks");
              }}
            />
          );
        }}
      </DataTable>
    </div>
  );
}

function getPostureChecksColumns(
  t: (key: any, values?: Record<string, string | number>) => string,
): ColumnDef<PostureCheck>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label={t("postureChecks.selectAll")}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("postureChecks.selectRow")}
          variant={"tableCell"}
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
    cell: ({ row }) => (
      <PostureCheckNameCell small={true} check={row.original} />
    ),
  },
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <DataTableHeader column={column}>{t("postureChecks.checks")}</DataTableHeader>
      );
    },
    cell: ({ row }) => <PostureCheckChecksCell check={row.original} />,
  },
];
}
