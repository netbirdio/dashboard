"use client";

import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useI18n } from "@/i18n/I18nProvider";
import {
  isL4Mode,
  REVERSE_PROXY_DOCS_LINK,
  ReverseProxy,
} from "@/interfaces/ReverseProxy";
import ReverseProxyActionCell from "@/modules/reverse-proxy/table/ReverseProxyActionCell";
import ReverseProxyAccessControlCell from "@/modules/reverse-proxy/table/ReverseProxyAccessControlCell";
import ReverseProxyActiveCell from "@/modules/reverse-proxy/table/ReverseProxyActiveCell";
import ReverseProxyAuthCell from "@/modules/reverse-proxy/table/ReverseProxyAuthCell";
import ReverseProxyClusterCell from "@/modules/reverse-proxy/table/ReverseProxyClusterCell";
import ReverseProxyNameCell from "@/modules/reverse-proxy/table/ReverseProxyNameCell";
import ReverseProxyStatusCell from "@/modules/reverse-proxy/table/ReverseProxyStatusCell";
import ReverseProxyTargetsCell from "@/modules/reverse-proxy/table/ReverseProxyTargetsCell";
import { ReverseProxyTypeCell } from "@/modules/reverse-proxy/table/ReverseProxyTypeCell";
import ReverseProxyTargetsTable from "@/modules/reverse-proxy/targets/ReverseProxyTargetsTable";

function useReverseProxyColumns() {
  const { t } = useI18n();

  return useMemo<ColumnDef<ReverseProxy>[]>(
    () => [
      {
        accessorKey: "domain",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("reverseProxy.domain")}
            </DataTableHeader>
          );
        },
        sortingFn: "text",
        cell: ({ row }) => <ReverseProxyNameCell reverseProxy={row.original} />,
      },
      {
        accessorKey: "mode",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("reverseProxy.type")}
            </DataTableHeader>
          );
        },
        sortingFn: "text",
        cell: ({ row }) => <ReverseProxyTypeCell reverseProxy={row.original} />,
      },
      {
        id: "status",
        accessorFn: (proxy) => proxy?.meta?.certificate_issued_at,
        header: "",
        cell: ({ row }) =>
          row.original.id ? (
            <ReverseProxyStatusCell
              serviceId={row.original.id}
              meta={row.original.meta}
              enabled={row.original.enabled}
              isL4={isL4Mode(row.original.mode)}
            />
          ) : null,
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>{t("table.active")}</DataTableHeader>
          );
        },
        cell: ({ row }) => (
          <ReverseProxyActiveCell reverseProxy={row.original} />
        ),
      },
      {
        accessorKey: "proxy_cluster",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("reverseProxy.cluster")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => (
          <ReverseProxyClusterCell reverseProxy={row.original} />
        ),
      },
      {
        accessorKey: "targets",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("reverseProxy.targets")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => (
          <ReverseProxyTargetsCell reverseProxy={row.original} />
        ),
      },
      {
        accessorKey: "auth",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("reverseProxy.authMethods")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => <ReverseProxyAuthCell reverseProxy={row.original} />,
      },
      {
        id: "access_rules",
        header: ({ column }) => {
          return (
            <DataTableHeader column={column}>
              {t("reverseProxy.accessControl")}
            </DataTableHeader>
          );
        },
        cell: ({ row }) => (
          <ReverseProxyAccessControlCell reverseProxy={row.original} />
        ),
      },
      {
        accessorKey: "id",
        header: "",
        cell: ({ row }) => (
          <ReverseProxyActionCell reverseProxy={row.original} />
        ),
      },
      {
        id: "searchString",
        accessorFn: (row) => {
          return [
            row?.domain,
            row?.proxy_cluster,
            row?.targets?.map((t) => t.destination).join(""),
            row?.targets?.map((t) => t.host).join(""),
            row?.targets?.map((t) => t.port).join(""),
          ].join("");
        },
      },
    ],
    [t],
  );
}

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function ReverseProxyTable({ headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { reverseProxies, isLoading, openModal } = useReverseProxies();
  const { t } = useI18n();
  const columns = useReverseProxyColumns();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "domain",
        desc: false,
      },
    ],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      inset={false}
      text={t("reverseProxy.tableTitle")}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={reverseProxies}
      useRowId={true}
      searchPlaceholder={t("reverseProxy.searchPlaceholder")}
      columnVisibility={{ searchString: false }}
      tableCellClassName={"h-[80px]"}
      renderExpandedRow={(reverseProxy) => {
        if (isL4Mode(reverseProxy.mode)) return;
        const hasTargets = (reverseProxy?.targets?.length ?? 0) > 0;
        if (!hasTargets) return;
        return (
          <>
            <ReverseProxyTargetsTable reverseProxy={reverseProxy} />
            <div className={"h-2 w-full bg-nb-gray-960"}></div>
          </>
        );
      }}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={
                <ReverseProxyIcon className={"fill-nb-gray-200"} size={20} />
              }
              color={"gray"}
              size={"large"}
            />
          }
          title={t("reverseProxy.emptyTitle")}
          description={t("reverseProxy.emptyDescription")}
          button={
            <Button
              variant={"primary"}
              onClick={() => openModal()}
              disabled={!permission?.services?.create}
            >
              <PlusCircle size={16} />
              {t("reverseProxy.addService")}
            </Button>
          }
          learnMore={
            <>
              {t("common.learnMorePrefix")}
              <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
                {t("reverseProxy.servicesTitle")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => (
        <>
          {reverseProxies && reverseProxies.length > 0 && (
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
        </>
      )}
    >
      {(table) => (
        <>
          <ButtonGroup disabled={reverseProxies?.length == 0}>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("enabled")?.setFilterValue(undefined);
              }}
              disabled={reverseProxies?.length == 0}
              variant={
                table.getColumn("enabled")?.getFilterValue() === undefined
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("filters.all")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("enabled")?.setFilterValue(true);
              }}
              disabled={reverseProxies?.length == 0}
              variant={
                table.getColumn("enabled")?.getFilterValue() === true
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("table.active")}
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("enabled")?.setFilterValue(false);
              }}
              disabled={reverseProxies?.length == 0}
              variant={
                table.getColumn("enabled")?.getFilterValue() === false
                  ? "tertiary"
                  : "secondary"
              }
            >
              {t("reverseProxy.inactive")}
            </ButtonGroup.Button>
          </ButtonGroup>
          <DataTableRowsPerPage
            table={table}
            disabled={reverseProxies?.length == 0}
          />
          <DataTableRefreshButton
            isDisabled={reverseProxies?.length == 0}
            onClick={() => {
              mutate("/reverse-proxies/services").then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
