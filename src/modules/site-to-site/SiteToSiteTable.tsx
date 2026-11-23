import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import DataTableResetFilterButton from "@components/table/DataTableResetFilterButton";
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
import { PolicyCountBadge } from "@components/ui/PolicyCountBadge";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import {
  ExternalLinkIcon,
  Link2,
  MoreVertical,
  PlusCircle,
  ServerIcon,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Network } from "@/interfaces/Network";
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import { NetworkInformationSquare } from "@/modules/networks/misc/NetworkInformationSquare";
import {
  connectionKey,
  connectionNetworks,
  connectionPolicies,
} from "@/modules/site-to-site/siteToSite";
import { useSiteToSite } from "@/modules/site-to-site/SiteToSiteProvider";

const SITE_TO_SITE_DOCS_LINK = "https://docs.netbird.io/manage/networks";

type Row = SiteToSiteConnection & { id: string; networks: Network[] };

const NetworksCell = ({ row }: { row: Row }) => {
  const router = useRouter();
  const { countriesOf } = useSiteToSite();
  return (
    <div className={"flex items-center gap-4 min-w-[420px]"}>
      {row.networks.map((network, index) => (
        <React.Fragment key={network.id}>
          {index > 0 && (
            <Link2 size={14} className={"text-nb-gray-500 shrink-0"} />
          )}
          <div className={"flex items-center gap-3 min-w-0"}>
            <NetworkInformationSquare
              name={network.name}
              active={(network.routing_peers_count ?? 0) > 0}
              onClick={() => router.push(`/network?id=${network.id}`)}
            />
            {countriesOf(network).length > 0 && (
              <div className={"flex items-center gap-1"}>
                {countriesOf(network).map((c) => (
                  <RoundedFlag key={c} country={c} size={12} />
                ))}
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

const PoliciesCell = ({ row }: { row: Row }) => {
  const { permission } = usePermissions();
  const { policies, openEditPolicy, openAddPolicy } = useSiteToSite();
  return (
    <PolicyCountBadge
      policies={connectionPolicies(row, policies)}
      canConfigure={!!permission.policies.update}
      onSelectPolicy={openEditPolicy}
      onConfigure={() => openAddPolicy(row)}
      configureLabel={"Add policy"}
    />
  );
};

const RoutingPeersCell = ({ row }: { row: Row }) => {
  const { permission } = usePermissions();
  const { openDeployRoutingPeer } = useSiteToSite();
  const unrouted = row.networks.filter((n) => !n.routing_peers_count);
  const total = row.networks.reduce(
    (sum, n) => sum + (n.routing_peers_count ?? 0),
    0,
  );
  const ready = unrouted.length === 0;

  return (
    <div className={"flex gap-3 items-center"}>
      <FullTooltip
        interactive={false}
        content={
          <div className={"max-w-xs text-xs flex flex-col gap-1"}>
            {row.networks.map((n) => (
              <div key={n.id}>
                <span className={"text-white font-medium"}>{n.name}</span>:{" "}
                {n.routing_peers_count ?? 0} routing peer(s)
              </div>
            ))}
          </div>
        }
      >
        <Badge
          variant={"gray"}
          className={
            "inline-flex gap-2 min-w-[110px] font-medium items-center justify-center min-h-[34px]"
          }
          useHover={false}
        >
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              ready ? "bg-green-500" : "bg-yellow-400",
            )}
          />
          {total} Peer(s)
        </Badge>
      </FullTooltip>
      {!ready && (
        <Button
          size={"xs"}
          variant={"secondary"}
          className={"!px-3"}
          onClick={() => openDeployRoutingPeer(unrouted)}
          disabled={!permission.networks.update}
        >
          <ServerIcon size={12} />
          Deploy
        </Button>
      )}
    </div>
  );
};

const ActionCell = ({ row }: { row: Row }) => {
  const { permission } = usePermissions();
  const { openAddPolicy, openDeployRoutingPeer, deleteConnection } =
    useSiteToSite();
  return (
    <div className={"flex justify-end pr-4"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button
            variant={"secondary"}
            className={"!px-3"}
            data-testid={"site-to-site-actions"}
          >
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => openAddPolicy(row)}
            disabled={!permission.policies.create}
          >
            <div className={"flex gap-3 items-center"}>
              <PlusCircle size={14} className={"shrink-0"} />
              Add Policy
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openDeployRoutingPeer(row.networks)}
            disabled={!permission.networks.update}
          >
            <div className={"flex gap-3 items-center"}>
              <ServerIcon size={14} className={"shrink-0"} />
              Deploy Routing Peer
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void deleteConnection(row)}
            variant={"danger"}
            disabled={!permission.policies.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const columns: ColumnDef<Row>[] = [
  {
    id: "networks",
    accessorFn: (row) => row.networks.map((n) => n.name).join(" "),
    header: ({ column }) => (
      <DataTableHeader column={column}>Networks</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => <NetworksCell row={row.original} />,
  },
  {
    id: "policies",
    accessorFn: (row) => row.policy_ids.length,
    header: ({ column }) => (
      <DataTableHeader column={column}>Policies</DataTableHeader>
    ),
    cell: ({ row }) => <PoliciesCell row={row.original} />,
  },
  {
    id: "routing_peers",
    accessorFn: (row) =>
      row.networks.reduce((sum, n) => sum + (n.routing_peers_count ?? 0), 0),
    header: ({ column }) => (
      <DataTableHeader column={column}>Routing Peers</DataTableHeader>
    ),
    cell: ({ row }) => <RoutingPeersCell row={row.original} />,
  },
  {
    id: "enabled",
    accessorFn: (row) => row.enabled,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <ActionCell row={row.original} />,
  },
];

type Props = {
  data?: SiteToSiteConnection[];
  isLoading: boolean;
  headingTarget?: HTMLHeadingElement | null;
};

export default function SiteToSiteTable({
  data,
  isLoading,
  headingTarget,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { networks, isLoading: contextLoading } = useSiteToSite();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "networks", desc: false }],
  );

  const rows = useMemo<Row[] | undefined>(
    () =>
      data?.map((connection) => ({
        ...connection,
        id: connectionKey(connection),
        networks: connectionNetworks(connection, networks),
      })),
    [data, networks],
  );

  const statusOptions = useMemo<RadioOption<boolean | undefined>[]>(
    () => [
      { value: undefined, label: "All", dotClass: "bg-nb-gray-500" },
      { value: true, label: "Enabled", dotClass: "bg-green-500" },
      { value: false, label: "Disabled", dotClass: "bg-nb-gray-700" },
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
    ],
    [statusOptions],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading || contextLoading}
      text={"Site-to-Site Connections"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={rows}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={"Search by network name..."}
      columnVisibility={{ enabled: false }}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={
                <NetworkRoutesIcon className={"fill-nb-gray-200"} size={20} />
              }
              color={"gray"}
              size={"large"}
            />
          }
          title={"Connect Your Networks"}
          description={
            "It looks like you don't have any site-to-site connections yet. Let resources in one network reach resources in another, with a policy and a routing peer on each side."
          }
          button={
            <div className={"gap-x-4 flex items-center justify-center"}>
              <AddConnectionButton />
            </div>
          }
          learnMore={
            <>
              Learn more about
              <InlineLink href={SITE_TO_SITE_DOCS_LINK} target={"_blank"}>
                Networks
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() =>
        rows &&
        rows.length > 0 && (
          <div className={"gap-x-4 ml-auto flex"}>
            <AddConnectionButton />
          </div>
        )
      }
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={rows?.length == 0}
          />
          <DataTableRefreshButton
            isDisabled={rows?.length == 0}
            onClick={() => {
              mutate("/networks/site-to-site");
              mutate("/policies");
              mutate("/networks");
            }}
          />
          <DataTableResetFilterButton
            table={table}
            onClick={() => {
              table.setPageIndex(0);
              table.resetColumnFilters();
              table.resetGlobalFilter();
            }}
          />
        </>
      )}
    </DataTable>
  );
}

const AddConnectionButton = () => {
  const { permission } = usePermissions();
  const { openCreateConnection } = useSiteToSite();
  return (
    <Button
      variant={"primary"}
      onClick={openCreateConnection}
      disabled={!permission.networks.create || !permission.policies.create}
      data-testid={"add-site-to-site-connection"}
    >
      <PlusCircle size={16} />
      Add Site-to-Site Connection
    </Button>
  );
};
