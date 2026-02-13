import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import React, { useState } from "react";
import { ReverseProxy, ReverseProxyTarget } from "@/interfaces/ReverseProxy";
import ReverseProxyArrowCell from "@/modules/reverse-proxy/table/ReverseProxyArrowCell";
import ReverseProxyDestinationCell from "@/modules/reverse-proxy/table/ReverseProxyDestinationCell";
import { ReverseProxyTargetActionCell } from "@/modules/reverse-proxy/targets/ReverseProxyTargetActionCell";
import ReverseProxyTargetActiveCell from "@/modules/reverse-proxy/targets/ReverseProxyTargetActiveCell";
import { ReverseProxyTargetProvider } from "@/modules/reverse-proxy/targets/ReverseProxyTargetContext";
import { ReverseProxyTargetDevice } from "@/modules/reverse-proxy/targets/ReverseProxyTargetDevice";
import { ReverseProxyTargetPath } from "@/modules/reverse-proxy/targets/ReverseProxyTargetPath";

const ReverseProxyTargetColumns: ColumnDef<ReverseProxyTarget>[] = [
  {
    accessorKey: "target_type",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Resource</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyTargetDevice target={row.original} />,
  },
  {
    accessorKey: "path",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Location</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyTargetPath target={row.original} />,
  },
  {
    accessorKey: "arrow",
    header: "",
    cell: ({ row }) => (
      <ReverseProxyArrowCell disabled={!row.original.enabled} />
    ),
  },
  {
    accessorKey: "host",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Destination</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyDestinationCell target={row.original} />,
  },
  {
    accessorKey: "enabled",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyTargetActiveCell target={row.original} />,
  },
  {
    accessorKey: "target_id",
    header: "",
    cell: ({ row }) => <ReverseProxyTargetActionCell target={row.original} />,
  },
];

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyTargetsTable({ reverseProxy }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  return (
    <ReverseProxyTargetProvider value={reverseProxy}>
      <DataTable
        uniqueKey={reverseProxy.id}
        keepStateInLocalStorage={false}
        tableClassName={"mt-0"}
        minimal={true}
        showSearchAndFilters={false}
        rowClassName={"last:pb-10"}
        tableCellClassName={"py-0"}
        className={"bg-nb-gray-960 py-2"}
        inset={true}
        text={"Targets"}
        manualPagination={true}
        sorting={sorting}
        columnVisibility={{}}
        setSorting={setSorting}
        columns={ReverseProxyTargetColumns}
        data={reverseProxy.targets}
      />
    </ReverseProxyTargetProvider>
  );
}
