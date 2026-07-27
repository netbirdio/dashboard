import { useTranslations } from "next-intl";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ReceiptTextIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import InvoicesActionCell from "@/cloud/invoices/table/InvoicesActionCell";
import InvoicesPeriodCell from "@/cloud/invoices/table/InvoicesPeriodCell";
import InvoicesTypeCell from "@/cloud/invoices/table/InvoicesTypeCell";
import { Invoice } from "@/cloud/msp/interfaces/Invoice";

type Props = {
  invoices?: Invoice[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

function getInvoiceColumns(t: (key: string) => string): ColumnDef<Invoice>[] {
  return [
    {
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("date")}</DataTableHeader>;
      },
      accessorKey: "period_start",
      cell: ({ row }) => <InvoicesPeriodCell invoice={row.original} />,
    },
    {
      accessorKey: "period_end",
    },
    {
      header: ({ column }) => {
        return <DataTableHeader column={column}>{t("type")}</DataTableHeader>;
      },
      accessorKey: "type",
      cell: ({ row }) => <InvoicesTypeCell invoice={row.original} />,
    },
    {
      accessorKey: "id",
      header: () => null,
      sortingFn: "text",
      cell: ({ row }) => <InvoicesActionCell invoice={row.original} />,
    },
  ];
}

export default function InvoicesTable({
  invoices,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const t = useTranslations("invoices");
  const { isActive: isDistributor } = useDistributor();
  const apiRequestPath = isDistributor
    ? "/integrations/msp/reseller/invoices"
    : "/integrations/billing/invoices";
  const { mutate } = useSWRConfig();

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "period_end",
      desc: true,
    },
  ]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      headingTarget={headingTarget}
      useRowId={true}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      tableCellClassName={""}
      rowClassName={"last:mb-5"}
      text={t("title")}
      columns={getInvoiceColumns(t)}
      keepStateInLocalStorage={false}
      data={invoices}
      searchPlaceholder={t("searchPlaceholder")}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={t("noInvoicesTitle")}
          description={t("noInvoicesDescription")}
          icon={<ReceiptTextIcon size={20} />}
        />
      }
      columnVisibility={{
        period_end: false,
      }}
      paginationPaddingClassName={"px-0 pt-8"}
    >
      {(table) => (
        <>
          <DataTableRowsPerPage
            table={table}
            disabled={invoices?.length == 0}
          />
          <DataTableRefreshButton
            isDisabled={invoices?.length == 0}
            onClick={() => {
              mutate(apiRequestPath).then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
