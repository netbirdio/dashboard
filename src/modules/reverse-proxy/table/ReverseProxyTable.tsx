import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
import {
  CheckboxListPicker,
  CheckboxOption,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatRadioChip,
  RadioOption,
  RadioPicker,
} from "@components/table/filters/RadioPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
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
import {
  isL4Mode,
  REVERSE_PROXY_DOCS_LINK,
  ReverseProxy,
} from "@/interfaces/ReverseProxy";
import ReverseProxyActionCell from "@/modules/reverse-proxy/table/ReverseProxyActionCell";
import ReverseProxyAccessControlCell from "@/modules/reverse-proxy/table/ReverseProxyAccessControlCell";
import ReverseProxyAuthCell from "@/modules/reverse-proxy/table/ReverseProxyAuthCell";
import ReverseProxyNameCell from "@/modules/reverse-proxy/table/ReverseProxyNameCell";
import ReverseProxyTargetsCell from "@/modules/reverse-proxy/table/ReverseProxyTargetsCell";
import ReverseProxyTargetsTable from "@/modules/reverse-proxy/targets/ReverseProxyTargetsTable";
import { ReverseProxyTypeCell } from "@/modules/reverse-proxy/table/ReverseProxyTypeCell";

const ReverseProxyColumns: ColumnDef<ReverseProxy>[] = [
  {
    accessorKey: "domain",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Domain</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <ReverseProxyNameCell reverseProxy={row.original} />,
  },
  {
    accessorKey: "mode",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Type</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <ReverseProxyTypeCell reverseProxy={row.original} />,
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "enabled",
    accessorKey: "enabled",
  },
  {
    accessorKey: "targets",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Target(s)</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyTargetsCell reverseProxy={row.original} />,
  },
  {
    id: "auth_and_access",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Auth &amp; Access</DataTableHeader>;
    },
    cell: ({ row }) => (
      <div className={"flex items-center gap-2"}>
        <ReverseProxyAuthCell reverseProxy={row.original} />
        <ReverseProxyAccessControlCell reverseProxy={row.original} />
      </div>
    ),
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <ReverseProxyActionCell reverseProxy={row.original} />,
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
      ]?.join("");
    },
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function ReverseProxyTable({ headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { reverseProxies, isLoading, openModal } = useReverseProxies();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "domain",
        desc: false,
      },
    ],
  );

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Active", dotClass: "bg-green-500" },
      { value: false, label: "Inactive", dotClass: "bg-nb-gray-700" },
    ],
    [],
  );

  const typeOptions = useMemo<CheckboxOption<string>[]>(
    () => [
      { value: "http", label: "HTTP" },
      { value: "tcp", label: "TCP" },
      { value: "udp", label: "UDP" },
      { value: "tls", label: "TLS" },
    ],
    [],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "enabled",
        label: "Status",
        renderPicker: (p) => (
          <RadioPicker
            value={p.value as boolean | undefined}
            onChange={p.onChange}
            close={p.close}
            options={statusOptions}
          />
        ),
        formatChip: (v) =>
          formatRadioChip(v as boolean | undefined, statusOptions),
      },
      {
        id: "mode",
        label: "Type",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            options={typeOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(v as string[] | undefined, typeOptions, "types"),
      },
    ],
    [statusOptions, typeOptions],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      inset={false}
      text={"Reverse Proxy"}
      sorting={sorting}
      setSorting={setSorting}
      columns={ReverseProxyColumns}
      data={reverseProxies}
      useRowId={true}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={"Search by URL, domain, or target..."}
      rowClassName={(row) => (row.original.enabled ? "" : "opacity-50")}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      columnVisibility={{ searchString: false, enabled: false }}
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
          title={"Create Services"}
          description={
            "Expose your internal services securely through NetBird's reverse proxy with automatic TLS and optional authentication to protect your services."
          }
          button={
            <Button
              variant={"primary"}
              onClick={() => openModal()}
              disabled={!permission?.services?.create}
            >
              <PlusCircle size={16} />
              Add Service
            </Button>
          }
          learnMore={
            <>
              Learn more about
              <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
                Services
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => (
        <>
          {reverseProxies && reverseProxies?.length > 0 && (
            <Button
              variant={"primary"}
              className={"ml-auto"}
              onClick={() => openModal()}
              disabled={!permission?.services?.create}
            >
              <PlusCircle size={16} />
              Add Service
            </Button>
          )}
        </>
      )}
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={reverseProxies?.length == 0}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
            }}
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
