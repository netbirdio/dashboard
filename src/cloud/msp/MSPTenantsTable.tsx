import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState, Table } from "@tanstack/react-table";
import { HelpCircle, PlusCircle, ReceiptTextIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { Fragment } from "react";
import { useSWRConfig } from "swr";
import MSPIcon from "@/assets/icons/MSPIcon";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import { Tenant } from "@/cloud/msp/interfaces/Tenant";
import { MSPTenantDocsLink } from "@/cloud/msp/MSPTenantDocsLink";
import { TenantActionCell } from "@/cloud/msp/table/TenantActionCell";
import { TenantGroupsCell } from "@/cloud/msp/table/TenantGroupsCell";
import { TenantNameCell } from "@/cloud/msp/table/TenantNameCell";
import { TenantPeersCell } from "@/cloud/msp/table/TenantPeersCell";
import { TenantPlanCell } from "@/cloud/msp/table/TenantPlanCell";
import { TenantPlanCostCell } from "@/cloud/msp/table/TenantPlanCostCell";
import { TenantUsersCell } from "@/cloud/msp/table/TenantUsersCell";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";

const TenantsTableColumns: ColumnDef<Tenant>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column}>Tenant</DataTableHeader>
    ),
    cell: ({ row }) => <TenantNameCell tenant={row.original} />,
  },
  {
    id: "domain",
    accessorKey: "domain",
  },
  {
    id: "plan",
    accessorKey: "plan",
    header: ({ column }) => (
      <DataTableHeader column={column}>Plan</DataTableHeader>
    ),
    cell: ({ row }) => <TenantPlanCell tenant={row.original} />,
  },
  {
    id: "users",
    accessorKey: "users",
    header: ({ column }) => (
      <DataTableHeader column={column}>Users</DataTableHeader>
    ),
    cell: ({ row }) => <TenantUsersCell tenant={row.original} />,
  },
  {
    id: "peers",
    accessorKey: "peers",
    header: ({ column }) => (
      <DataTableHeader column={column}>Peers</DataTableHeader>
    ),
    cell: ({ row }) => <TenantPeersCell tenant={row.original} />,
  },
  {
    id: "cost",
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableHeader column={column}>
        Est. Cost / Month
        <FullTooltip
          content={
            <div className={"text-xs max-w-xs"}>
              The estimated price is calculated based on the number of active
              users and active peers.
            </div>
          }
          interactive={false}
        >
          <HelpCircle
            size={12}
            className={
              "text-nb-gray-300 hover:text-netbird transition-all cursor-pointer mr-2"
            }
          />
        </FullTooltip>
      </DataTableHeader>
    ),
    cell: ({ row }) => <TenantPlanCostCell tenant={row.original} />,
  },
  {
    id: "groups",
    accessorKey: "peers",
    header: ({ column }) => (
      <DataTableHeader column={column}>Permission Groups</DataTableHeader>
    ),
    cell: ({ row }) => <TenantGroupsCell tenant={row.original} />,
  },
  {
    id: "actions",
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <TenantActionCell tenant={row.original} />,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
  },
];

type Props = {
  tenants?: Tenant[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function MSPTenantsTable({
  tenants,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { hasReseller } = useMSP();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const path = usePathname();
  const router = useRouter();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "created_at",
        desc: true,
      },
      {
        id: "name",
        desc: false,
      },
      {
        id: "domain",
        desc: false,
      },
    ],
  );

  const refreshSubscriptions = (table: Table<Tenant>) => {
    const visibleTenants = table
      ?.getPaginationRowModel()
      .rows.map((row) => row.original);

    const tenantIds = visibleTenants.map((tenant) => tenant.id);
    if (tenantIds.length === 0) return;

    tenantIds.forEach((id) => {
      mutate(`/integrations/billing/usage?account=${id}`);
      mutate(`/integrations/billing/subscription?account=${id}`);
    });
  };

  return (
    <>
      <LockedFeatureInfoCard
        className={"px-4 sm:px-6 md:px-8 mt-0 mb-8"}
        featureText={"Managing Tenants"}
        feature={"MSP"}
        offerTrial={false}
      />

      <LockedFeatureOverlay
        opacity={tenants && tenants?.length > 0 ? 35 : 60}
        feature={"MSP"}
      >
        <DataTable
          headingTarget={headingTarget}
          useRowId={true}
          text={"Tenants"}
          sorting={sorting}
          setSorting={setSorting}
          columns={TenantsTableColumns}
          data={tenants}
          searchPlaceholder={"Search by name, email or group..."}
          columnVisibility={{
            created_at: false,
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
              title={"Add New Tenant"}
              description={
                "It looks like you don't have any tenants yet. Add a new tenant to get started."
              }
              button={<AddTenantButton />}
              learnMore={<MSPTenantDocsLink />}
            />
          }
          rightSide={() => (
            <div className={"ml-auto flex gap-14"}>
              {tenants && tenants.length > 0 && (
                <div className={"flex gap-4 items-center"}>
                  {permission?.billing?.update && !hasReseller && (
                    <Button
                      variant={"secondary"}
                      onClick={() => router.push("/settings?tab=invoices")}
                    >
                      <ReceiptTextIcon size={16} />
                      Invoices
                    </Button>
                  )}

                  <AddTenantButton />
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
                  disabled={tenants?.length == 0}
                />

                <DataTableRefreshButton
                  isDisabled={tenants?.length == 0}
                  onClick={() => {
                    mutate("/integrations/msp/tenants");
                    mutate("/integrations/msp/switcher");
                    mutate("/integrations/billing/invoice");
                    mutate("/groups");
                    mutate("/users");
                    refreshSubscriptions(table);
                  }}
                />
              </>
            );
          }}
        </DataTable>
      </LockedFeatureOverlay>
    </>
  );
}

const AddTenantButton = () => {
  const { openCreateTenantModal } = useTenants();
  return (
    <Button variant={"primary"} size={"sm"} onClick={openCreateTenantModal}>
      <PlusCircle size={16} />
      Add Tenant
    </Button>
  );
};

