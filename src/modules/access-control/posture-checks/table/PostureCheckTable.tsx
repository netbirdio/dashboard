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
import { PostureCheck } from "@/interfaces/PostureCheck";
import { PostureCheckChecksCell } from "@/modules/access-control/posture-checks/table/PostureCheckChecksCell";
import { PostureCheckNameCell } from "@/modules/access-control/posture-checks/table/PostureCheckNameCell";

type Props = {
  onAdd: (checks: PostureCheck[]) => void;
};

export default function PostureCheckTable({ onAdd }: Props) {
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
    <div className={""}>
      <DataTable
        isLoading={isLoading}
        text={"Posture Check"}
        sorting={sorting}
        wrapperClassName={""}
        setSorting={setSorting}
        columns={PostureChecksColumns}
        showHeader={true}
        columnVisibility={{
          description: false,
        }}
        tableClassName={"mt-6 !border-0"}
        rowClassName={"!border-b-0 px-10"}
        data={postureChecks}
        searchPlaceholder={"Search by name and description..."}
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
                  mutate("/posture-checks");
                }}
              />
            </>
          );
        }}
      </DataTable>
    </div>
  );
}

export const PostureChecksColumns: ColumnDef<PostureCheck>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className={"min-w-[20px] max-w-[20px]"}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckNameCell check={row.original} />,
  },
  {
    accessorKey: "id",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Checks</DataTableHeader>;
    },
    cell: ({ row }) => <PostureCheckChecksCell check={row.original} />,
  },
];
