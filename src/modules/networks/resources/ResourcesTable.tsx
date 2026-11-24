import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import { fadeDisabledRowCells } from "@components/table/disabledRowCells";
import {
  TableFilterChips,
  TableFiltersButton,
} from "@components/table/TableFilters";
import NoResults from "@components/ui/NoResults";
import { SortingState } from "@tanstack/react-table";
import { ArrowUpRightIcon, Layers3Icon, PlusCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import {
  RESOURCE_HIDDEN_COLUMNS,
  useResourceTable,
} from "@/modules/networks/resources/useResourceTable";

type Props = {
  resources?: NetworkResource[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
  isGroupPage?: boolean;
};

export default function ResourcesTable({
  resources,
  isLoading,
  headingTarget,
  isGroupPage,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const params = useSearchParams();
  const resourceId = params.get("resource") ?? undefined;

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "name",
      desc: false,
    },
  ]);
  const { openResourceModal, network } = useNetworksContext();
  const router = useRouter();
  const { columns, filterDefs } = useResourceTable({ resources });

  const removeResourceParam = React.useCallback(() => {
    if (!resourceId) return;
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("resource");
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }, [resourceId, params, router]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 pb-2 w-full" }}
      headingTarget={headingTarget}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={true}
      inset={false}
      tableClassName={"mt-0"}
      text={"Resources"}
      columns={columns}
      keepStateInLocalStorage={false}
      initialPageSize={25}
      showResetFilterButton={false}
      initialFilters={
        resourceId ? [{ id: "id", value: resourceId }] : undefined
      }
      initialSearch={resourceId}
      onFilterReset={removeResourceParam}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      data={resources}
      searchPlaceholder={"Search by name, address or group..."}
      isLoading={isLoading}
      getStartedCard={
        <NoResults
          className={"py-4"}
          title={
            isGroupPage
              ? "This group has no assigned resources"
              : "This network has no resources"
          }
          description={
            isGroupPage
              ? "Assign this group to your resources inside your networks to see them listed here."
              : "Add resources to this network to control what peers can access. Resources can be anything from a single IP, a subnet, or a domain."
          }
          icon={<Layers3Icon size={20} className={"text-nb-gray-400"} />}
        >
          {isGroupPage && permission?.networks?.create && (
            <>
              <Button
                variant={"primary"}
                className={"mt-4"}
                onClick={() => router.push("/networks")}
              >
                Go to Networks
                <ArrowUpRightIcon size={16} />
              </Button>
            </>
          )}
        </NoResults>
      }
      columnVisibility={{ ...RESOURCE_HIDDEN_COLUMNS, network: false }}
      cellClassName={fadeDisabledRowCells}
      onRowClick={
        network && permission.networks.update
          ? (row) => openResourceModal(network, row.original)
          : undefined
      }
      paginationPaddingClassName={"px-0 pt-8"}
      rightSide={
        !isGroupPage
          ? () => (
              <Button
                variant={"primary"}
                className={"ml-auto mr-4"}
                onClick={() => network && openResourceModal(network)}
                disabled={!permission.networks.update}
                data-testid={"add-resource"}
              >
                <PlusCircle size={16} />
                Add
              </Button>
            )
          : undefined
      }
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={!resources || resources?.length == 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.setColumnFilters([]);
              table.setGlobalFilter("");
              removeResourceParam();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
