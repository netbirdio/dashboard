import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import React, { createContext, useContext, useState } from "react";
import { DNSRecord, DNSZone } from "@/interfaces/DNS";
import { useI18n } from "@/i18n/I18nProvider";
import { DNSRecordActionCell } from "@/modules/dns/zones/records/DNSRecordActionCell";
import { DNSRecordContentCell } from "@/modules/dns/zones/records/DNSRecordContentCell";
import { DNSRecordNameCell } from "@/modules/dns/zones/records/DNSRecordNameCell";
import { DNSRecordTimeToLiveCell } from "@/modules/dns/zones/records/DNSRecordTimeToLiveCell";
import { DNSRecordTypeCell } from "@/modules/dns/zones/records/DNSRecordTypeCell";

type Props = {
  zone: DNSZone;
};

export const useDNSRecordsTableColumns = (): ColumnDef<DNSRecord>[] => {
  const { t } = useI18n();

  return [
    {
      accessorKey: "type",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.type")}</DataTableHeader>;
      },
      cell: ({ row }) => <DNSRecordTypeCell record={row.original} />,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.hostname")}</DataTableHeader>;
      },
      cell: ({ row }) => <DNSRecordNameCell record={row.original} />,
    },
    {
      accessorKey: "content",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.content")}</DataTableHeader>;
      },
      cell: ({ row }) => <DNSRecordContentCell record={row.original} />,
    },
    {
      accessorKey: "ttl",
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("table.ttl")}</DataTableHeader>;
      },
      cell: ({ row }) => <DNSRecordTimeToLiveCell record={row.original} />,
    },
    {
      accessorKey: "id",
      header: "",
      cell: ({ row }) => <DNSRecordActionCell record={row.original} />,
    },
  ];
};

const ZoneContext = createContext({} as DNSZone);

export default function DNSRecordsTable({ zone }: Props) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useDNSRecordsTableColumns();

  return (
    <ZoneContext.Provider value={zone}>
      <DataTable
        uniqueKey={zone.id}
        keepStateInLocalStorage={false}
        tableClassName={"mt-0"}
        minimal={true}
        showSearchAndFilters={false}
        rowClassName={"last:pb-10"}
        className={"bg-nb-gray-960 py-2"}
        inset={true}
        text={t("dns.records")}
        initialPageSize={zone?.records?.length}
        manualPagination={true}
        sorting={sorting}
        columnVisibility={{}}
        setSorting={setSorting}
        columns={columns}
        data={zone.records}
      />
    </ZoneContext.Provider>
  );
}

export const useDNSZone = () => useContext(ZoneContext);
