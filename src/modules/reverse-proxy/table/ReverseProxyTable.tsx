import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  ArrowRight,
  ChevronDown,
  ExternalLinkIcon,
  LockKeyhole,
  PlusCircle,
  Server,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  REVERSE_PROXY_DOCS_LINK,
  ReverseProxy,
  ServiceMode,
  isL4Mode,
} from "@/interfaces/ReverseProxy";
import ReverseProxyActionCell from "@/modules/reverse-proxy/table/ReverseProxyActionCell";
import ReverseProxyActiveCell from "@/modules/reverse-proxy/table/ReverseProxyActiveCell";
import ReverseProxyAuthCell from "@/modules/reverse-proxy/table/ReverseProxyAuthCell";
import ReverseProxyClusterCell from "@/modules/reverse-proxy/table/ReverseProxyClusterCell";
import ReverseProxyNameCell from "@/modules/reverse-proxy/table/ReverseProxyNameCell";
import ReverseProxyTargetsCell from "@/modules/reverse-proxy/table/ReverseProxyTargetsCell";
import ReverseProxyTargetsTable from "@/modules/reverse-proxy/targets/ReverseProxyTargetsTable";
import ReverseProxyStatusCell from "@/modules/reverse-proxy/table/ReverseProxyStatusCell";

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
      return <DataTableHeader column={column}>Active</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyActiveCell reverseProxy={row.original} />,
  },
  {
    accessorKey: "proxy_cluster",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Cluster</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyClusterCell reverseProxy={row.original} />,
  },
  {
    accessorKey: "targets",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Targets</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyTargetsCell reverseProxy={row.original} />,
  },
  {
    accessorKey: "auth",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Auth Methods</DataTableHeader>;
    },
    cell: ({ row }) => <ReverseProxyAuthCell reverseProxy={row.original} />,
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
      searchPlaceholder={"Search by URL, domain, or target..."}
      columnVisibility={{ searchString: false }}
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
            <AddServiceDropdown
              openModal={openModal}
              disabled={!permission?.services?.create}
            />
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
            <div className={"ml-auto"}>
              <AddServiceDropdown
                openModal={openModal}
                disabled={!permission?.services?.create}
              />
            </div>
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
              All
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
              Active
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
              Inactive
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

type AddServiceDropdownProps = {
  openModal: (options?: { initialEndpointMode?: ServiceMode }) => void;
  disabled?: boolean;
};

function AddServiceDropdown({
  openModal,
  disabled,
}: Readonly<AddServiceDropdownProps>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"primary"} disabled={disabled}>
          <PlusCircle size={16} />
          Add Service
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-[200px]">
        <DropdownMenuItem
          onClick={() => openModal({ initialEndpointMode: ServiceMode.HTTP })}
        >
          <div className="flex gap-3 items-center">
            <Server size={14} className="shrink-0" />
            HTTP Service
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openModal({ initialEndpointMode: ServiceMode.TLS })}
        >
          <div className="flex gap-3 items-center">
            <LockKeyhole size={14} className="shrink-0" />
            TLS Passthrough
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openModal({ initialEndpointMode: ServiceMode.TCP })}
        >
          <div className="flex gap-3 items-center">
            <ArrowRight size={14} className="shrink-0" />
            TCP Service
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openModal({ initialEndpointMode: ServiceMode.UDP })}
        >
          <div className="flex gap-3 items-center">
            <ArrowRight size={14} className="shrink-0" />
            UDP Service
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
