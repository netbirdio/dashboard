import Button from "@components/Button";
import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { PlusCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { ReverseProxyFlatTarget } from "@/interfaces/ReverseProxy";
import ReverseProxyArrowCell from "@/modules/reverse-proxy/table/ReverseProxyArrowCell";
import ReverseProxyAccessControlCell from "@/modules/reverse-proxy/table/ReverseProxyAccessControlCell";
import ReverseProxyAuthCell from "@/modules/reverse-proxy/table/ReverseProxyAuthCell";
import ReverseProxyClusterCell from "@/modules/reverse-proxy/table/ReverseProxyClusterCell";
import ReverseProxyDestinationCell from "@/modules/reverse-proxy/table/ReverseProxyDestinationCell";
import ReverseProxyNameCell from "@/modules/reverse-proxy/table/ReverseProxyNameCell";
import ReverseProxyFlatTargetActionCell from "@/modules/reverse-proxy/targets/flat/ReverseProxyFlatTargetActionCell";
import ReverseProxyTargetActiveCell from "@/modules/reverse-proxy/targets/ReverseProxyTargetActiveCell";
import { ReverseProxyTargetProvider } from "@/modules/reverse-proxy/targets/ReverseProxyTargetContext";
import { ReverseProxyTargetDevice } from "@/modules/reverse-proxy/targets/ReverseProxyTargetDevice";

type Props = {
  targets: ReverseProxyFlatTarget[];
  isLoading?: boolean;
  hideResourceColumn?: boolean;
  emptyTableTitle?: string;
  emptyTableDescription?: string;
};

export const ReverseProxyFlatTargetsTable = ({
  targets,
  isLoading,
  hideResourceColumn,
  emptyTableTitle,
  emptyTableDescription,
}: Props) => {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "domain", desc: false },
  ]);
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const params = useSearchParams();
  const router = useRouter();
  const resourceId = params.get("target") ?? undefined;

  const removeResourceParam = useCallback(() => {
    if (!resourceId) return;
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("target");
    router.replace(`?${newParams.toString()}`, { scroll: false });
  }, [resourceId, params, router]);

  const columns = useMemo<ColumnDef<ReverseProxyFlatTarget>[]>(
    () => [
      {
        id: "target_id",
        accessorKey: "target_id",
        filterFn: "exactMatch",
      },
      {
        id: "domain",
        accessorFn: (row) => row.proxy.domain,
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("table.url")}</DataTableHeader>
        ),
        sortingFn: "text",
        cell: ({ row }) => {
          const target = row.original;
          const path = target.path
            ? target.path.startsWith("/")
              ? target.path
              : `/${target.path}`
            : "";
          const fullUrl = `${target.proxy.domain}${path}`;
          const disabled = !target.enabled;
          const isEnabled = target.proxy.enabled && target.enabled;

          return (
            <div className={disabled ? "opacity-40" : ""}>
              <ReverseProxyNameCell
                domain={fullUrl}
                enabled={isEnabled}
                reverseProxy={row.original.proxy}
                showChevron={false}
              />
            </div>
          );
        },
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
        header: ({ column }) => (
          <DataTableHeader column={column}>
            {t("table.destination")}
          </DataTableHeader>
        ),
        cell: ({ row }) => <ReverseProxyDestinationCell target={row.original} />,
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("table.active")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <ReverseProxyTargetProvider value={row.original.proxy}>
            <ReverseProxyTargetActiveCell target={row.original} />
          </ReverseProxyTargetProvider>
        ),
      },
      {
        accessorKey: "proxy_cluster",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("reverseProxy.cluster")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <ReverseProxyClusterCell reverseProxy={row.original.proxy} />
        ),
      },
      {
        accessorKey: "target_type",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("table.resource")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <ReverseProxyTargetDevice target={row.original} showDescription />
        ),
      },
      {
        accessorKey: "auth",
        header: ({ column }) => (
          <DataTableHeader column={column}>
            {t("reverseProxy.authMethods")}
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <ReverseProxyAuthCell reverseProxy={row.original.proxy} />
        ),
      },
      {
        id: "access_control",
        header: ({ column }) => (
          <DataTableHeader column={column}>
            {t("reverseProxy.accessControl")}
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <ReverseProxyAccessControlCell reverseProxy={row.original.proxy} />
        ),
      },
      {
        accessorKey: "actions",
        header: "",
        cell: ({ row }) => (
          <ReverseProxyFlatTargetActionCell target={row.original} />
        ),
      },
      {
        id: "searchString",
        accessorFn: (row) => {
          return [
            row.proxy.domain,
            row.destination,
            row.host,
            row.port,
            row.path,
          ].join("");
        },
      },
    ],
    [t],
  );

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "mt-6 w-full" }}
      isLoading={isLoading}
      inset={false}
      minimal={true}
      showSearchAndFilters={true}
      tableClassName="mt-0"
      text={t("reverseProxy.modalDefaultLabel")}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={targets}
      keepStateInLocalStorage={false}
      searchPlaceholder={t("reverseProxy.searchTargetsPlaceholder")}
      initialFilters={
        resourceId ? [{ id: "target_id", value: resourceId }] : undefined
      }
      initialSearch={resourceId}
      onFilterReset={removeResourceParam}
      columnVisibility={{
        searchString: false,
        target_id: false,
        target_type: !hideResourceColumn,
      }}
      paginationPaddingClassName="px-0 pt-8"
      getStartedCard={
        <NoResults
          className="py-4"
          title={emptyTableTitle}
          description={emptyTableDescription}
          icon={<ReverseProxyIcon size={20} className="fill-nb-gray-300" />}
        />
      }
      rightSide={() => (
        <Button
          variant={"primary"}
          className={"ml-auto"}
          onClick={() => openModal()}
          disabled={!permission?.services?.create}
        >
          <PlusCircle size={16} />
          {t("reverseProxy.addService")}
        </Button>
      )}
    >
      {(table) => (
        <DataTableRowsPerPage
          table={table}
          disabled={!targets || targets.length === 0}
        />
      )}
    </DataTable>
  );
};
