import Button from "@components/Button";
import CopyToClipboardText from "@components/CopyToClipboardText";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { PlusCircle, ReceiptTextIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import MSPIcon from "@/assets/icons/MSPIcon";
import { DistributorDocsLink } from "@/cloud/distributor/DistributorDocsLink";
import { useCustomers } from "@/cloud/distributor/contexts/CustomersProvider";
import { DistributorCustomer } from "@/cloud/distributor/interfaces/Distributor";
import { CustomerActionCell } from "@/cloud/distributor/table/CustomerActionCell";
import { CustomerNameCell } from "@/cloud/distributor/table/CustomerNameCell";
import { CustomerPlanCell } from "@/cloud/distributor/table/CustomerPlanCell";
import { CustomerTenantsCell } from "@/cloud/distributor/table/CustomerTenantsCell";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";

const CustomerPlanCellWithUpgrade = ({
  customer,
}: {
  customer: DistributorCustomer;
}) => {
  const { openEditCustomerModal } = useCustomers();
  return (
    <CustomerPlanCell
      customer={customer}
      onUpgrade={() => openEditCustomerModal(customer, "plan")}
    />
  );
};

const CustomersTableColumns: ColumnDef<DistributorCustomer>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column}>Customer</DataTableHeader>
    ),
    cell: ({ row }) => <CustomerNameCell customer={row.original} />,
  },
  {
    id: "domain",
    accessorKey: "domain",
  },
  {
    id: "reseller_customer_id",
    accessorKey: "reseller_customer_id",
    header: ({ column }) => (
      <DataTableHeader column={column}>Customer ID</DataTableHeader>
    ),
    cell: ({ row }) =>
      row.original.reseller_customer_id ? (
        <CopyToClipboardText message={`Customer ID copied to clipboard`}>
          <span className={"text-sm text-nb-gray-300 font-mono"}>
            {row.original.reseller_customer_id}
          </span>
        </CopyToClipboardText>
      ) : (
        <EmptyRow />
      ),
  },
  {
    id: "plan",
    accessorKey: "plan",
    header: ({ column }) => (
      <DataTableHeader column={column}>Plan</DataTableHeader>
    ),
    cell: ({ row }) => <CustomerPlanCellWithUpgrade customer={row.original} />,
  },
  {
    id: "tenants",
    accessorKey: "tenants",
    header: ({ column }) => (
      <DataTableHeader column={column}>Tenants</DataTableHeader>
    ),
    cell: ({ row }) => <CustomerTenantsCell customer={row.original} />,
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <CustomerActionCell customer={row.original} />,
  },
];

type Props = {
  customers?: DistributorCustomer[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function DistributorCustomersTable({
  customers,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const router = useRouter();

  const refreshCustomers = () =>
    mutate(
      (key) =>
        typeof key === "string" &&
        [
          "/integrations/msp/reseller/msps",
          "/integrations/billing/subscription?account=",
          "/integrations/msp/tenants?account=",
        ].some((prefix) => key.startsWith(prefix)),
    );

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "name",
        desc: false,
      },
    ],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      useRowId={true}
      text={"Customers"}
      sorting={sorting}
      setSorting={setSorting}
      columns={CustomersTableColumns}
      data={customers}
      searchPlaceholder={"Search by name, domain or id..."}
      columnVisibility={{
        domain: false,
      }}
      isLoading={isLoading}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<MSPIcon size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Add New Customer"}
          description={
            "It looks like you don't have any customers yet. Add a new customer to get started."
          }
          button={<AddCustomerButton />}
          learnMore={<DistributorDocsLink />}
        />
      }
      rightSide={() => (
        <div className={"ml-auto flex gap-14"}>
          {customers && customers.length > 0 && (
            <div className={"flex gap-4 items-center"}>
              <Button
                variant={"secondary"}
                onClick={() => router.push("/settings?tab=invoices")}
              >
                <ReceiptTextIcon size={16} />
                Invoices
              </Button>
              <AddCustomerButton />
            </div>
          )}
        </div>
      )}
    >
      {(table) => {
        return (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={customers?.length == 0}
            />
            <DataTableRefreshButton
              isDisabled={customers?.length == 0}
              onClick={refreshCustomers}
            />
          </>
        );
      }}
    </DataTable>
  );
}

const AddCustomerButton = () => {
  const { openCreateCustomerModal } = useCustomers();
  return (
    <Button variant={"primary"} size={"sm"} onClick={openCreateCustomerModal}>
      <PlusCircle size={16} />
      Add Customer
    </Button>
  );
};
