"use client";

import DataTableHeader from "@components/table/DataTableHeader";
import { ColumnDef } from "@tanstack/react-table";
import * as React from "react";
import { SetupKey } from "@/interfaces/SetupKey";
import ExpirationDateRow from "@/modules/common-table-rows/ExpirationDateRow";
import LastTimeRow from "@/modules/common-table-rows/LastTimeRow";
import SetupKeyActionCell from "@/modules/setup-keys/SetupKeyActionCell";
import SetupKeyGroupsCell from "@/modules/setup-keys/SetupKeyGroupsCell";
import SetupKeyKeyCell from "@/modules/setup-keys/SetupKeyKeyCell";
import SetupKeyNameCell from "@/modules/setup-keys/SetupKeyNameCell";
import SetupKeyTypeCell from "@/modules/setup-keys/SetupKeyTypeCell";

export const SetupKeysTableColumns: ColumnDef<SetupKey>[] = [
  /*  {
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
  },*/
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => (
      <SetupKeyNameCell
        valid={row.original.valid}
        name={row.original?.name || ""}
      />
    ),
  },
  {
    id: "valid",
    accessorKey: "valid",
    sortingFn: "basic",
  },
  {
    accessorKey: "type",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Reusable</DataTableHeader>;
    },
    cell: ({ row }) => (
      <SetupKeyTypeCell reusable={row.original.type === "reusable"} />
    ),
  },
  {
    accessorKey: "key",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Key</DataTableHeader>;
    },
    cell: ({ row }) => <SetupKeyKeyCell text={row.original.key} />,
  },
  {
    id: "group_strings",
    accessorKey: "group_strings",
    accessorFn: (s) => s.groups?.map((g) => g?.name || "").join(", "),
  },
  {
    accessorKey: "last_used",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Last used</DataTableHeader>;
    },
    sortingFn: "datetime",
    cell: ({ row }) => (
      <LastTimeRow date={row.original.last_used} text={"Last used on"} />
    ),
  },
  {
    accessorFn: (item) => item.auto_groups?.length,
    id: "groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    cell: ({ row }) => <SetupKeyGroupsCell setupKey={row.original} />,
  },
  {
    accessorKey: "expires",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Expires</DataTableHeader>;
    },
    cell: ({ row }) => <ExpirationDateRow date={row.original.expires} />,
  },

  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => {
      return <SetupKeyActionCell setupKey={row.original} />;
    },
  },
];
