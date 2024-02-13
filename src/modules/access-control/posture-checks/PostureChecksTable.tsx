import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { useLocalStorage } from "@hooks/useLocalStorage";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import { usePathname } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import type { Policy } from "@/interfaces/Policy";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  postureChecks?: Policy[];
  isLoading: boolean;
};

export const PostureChecksColumns: ColumnDef<PostureCheck>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
  },
  {
    accessorKey: "id",
    header: "",
  },
];

export default function PostureChecksTable() {
  const { data: postureChecks, isLoading } =
    useFetchApi<PostureCheck[]>("/posture-checks");
  const { mutate } = useSWRConfig();
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
      <DataTable
        isLoading={isLoading}
        text={"Access Control"}
        sorting={sorting}
        setSorting={setSorting}
        columns={PostureChecksColumns}
        columnVisibility={{
          description: false,
        }}
        data={postureChecks}
        searchPlaceholder={"Search by name and description..."}
        onRowClick={(row) => row.toggleSelected()}
        rightSide={(table) => (
          <>
            {postureChecks && postureChecks?.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                disabled={table.getSelectedRowModel().rows.length <= 0}
              >
                Add Posture Checks ({table.getSelectedRowModel().rows.length})
              </Button>
            )}
          </>
        )}
      >
        {(table) => {
          return (
            <>
              <DataTableRefreshButton
                isDisabled={postureChecks?.length == 0}
                onClick={() => {
                  mutate("/policies");
                }}
              />
            </>
          );
        }}
      </DataTable>
    </>
  );
}
