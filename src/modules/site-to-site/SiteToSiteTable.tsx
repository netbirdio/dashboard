import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import GetStartedTest from "@components/ui/GetStartedTest";
import { PolicyCountBadge } from "@components/ui/PolicyCountBadge";
import { PolicyDirectionBadge } from "@components/ui/PolicyDirectionBadge";
import ResourceBadge from "@components/ui/ResourceBadge";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import {
  ChevronDown,
  ChevronRightIcon,
  ExternalLinkIcon,
  MoreVertical,
  PlusCircle,
  Power,
  ServerIcon,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useMemo, useState } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Network } from "@/interfaces/Network";
import { SiteToSiteConnection } from "@/interfaces/SiteToSite";
import { NetworkInformationSquare } from "@/modules/networks/misc/NetworkInformationSquare";
import {
  connectionKey,
  connectionLinks,
  connectionNetworks,
  SITE_TO_SITE_DOCS_LINK,
  SiteLink,
} from "@/modules/site-to-site/siteToSite";
import { useSiteToSite } from "@/modules/site-to-site/SiteToSiteProvider";

type Row = SiteToSiteConnection & {
  id: string;
  networks: Network[];
  links: SiteLink[];
  search: string;
};

// Connection rows and their link rows are separate tables. Both use a fixed
// layout with these widths and the same cell padding, so each network sits
// over its resources whatever the content.
const TABLE_LAYOUT = "table-fixed min-w-[1040px]";
const CELL_PADDING = "!px-4";
const COLUMN = {
  // The first side and the direction share one column, so the arrow can sit
  // midway between where the first and the second side start.
  first: "w-[52%]",
  second: "w-[26%]",
  // Centered: the header's tooltip wrapper is inline, so only text-align
  // moves it; the cells center their content the same way.
  count: "w-[140px] text-center",
  actions: "w-[88px]",
};

// The first side starts 48px into its cell (pl-12, past the chevron) and the
// second 12px into its own (pl-3); both cells pad 16px. Measured from the
// first cell's content box, the midpoint between the two starts is its
// center plus half the difference: (48 + 16 + 16 + 12) / 2 = 46.
const DIRECTION_CENTER = "calc(50% + 46px)";

/** Puts its child on the direction line, midway between the two sides. */
const OnDirectionLine = ({ children }: { children: React.ReactNode }) => (
  <div
    className={"absolute top-1/2 -translate-x-1/2 -translate-y-1/2"}
    style={{ left: DIRECTION_CENTER }}
  >
    {children}
  </div>
);

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const RoutingPeerLine = ({ network }: { network: Network }) => {
  const { onlineRoutingPeers, countriesOf } = useSiteToSite();
  const online = onlineRoutingPeers(network).length;
  if (online === 0) {
    return (
      <span className={"text-xs text-yellow-400 text-left whitespace-nowrap"}>
        {network.routing_peers_count
          ? "No routing peer online"
          : "No routing peer"}
      </span>
    );
  }
  return (
    <span
      className={
        "flex items-center gap-1.5 text-xs text-nb-gray-400 whitespace-nowrap"
      }
    >
      {countriesOf(network).map((c) => (
        <RoundedFlag key={c} country={c} size={12} />
      ))}
      {plural(online, "routing peer")} online
    </span>
  );
};

const NetworkCell = ({ network }: { network?: Network }) => {
  const router = useRouter();
  const { permission } = usePermissions();
  const { onlineRoutingPeers, openDeployRoutingPeer } = useSiteToSite();
  if (!network) return null;
  const online = onlineRoutingPeers(network).length;

  return (
    <div className={"flex items-center gap-2 min-w-0"}>
      <NetworkInformationSquare
        name={network.name}
        active={online > 0}
        onClick={() => router.push(`/network?id=${network.id}`)}
        subtitle={<RoutingPeerLine network={network} />}
      />
      {online === 0 && permission.networks.update && (
        <InlineButtonLink
          className={"text-xs whitespace-nowrap shrink-0 -ml-10"}
          onClick={(e) => {
            e.stopPropagation();
            openDeployRoutingPeer([network]);
          }}
        >
          Add routing peer
        </InlineButtonLink>
      )}
    </div>
  );
};

const FirstNetworkCell = ({ row }: { row: Row }) => (
  <div className={"flex items-center gap-4 min-w-0"}>
    <ChevronRightIcon
      size={20}
      className={
        "group-data-[accordion=opened]/accordion:hidden text-nb-gray-400 shrink-0"
      }
    />
    <ChevronDown
      size={20}
      className={
        "group-data-[accordion=closed]/accordion:hidden text-nb-gray-400 shrink-0"
      }
    />
    <NetworkCell network={row.networks[0]} />
  </div>
);

const RowMenu = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
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
          aria-label={label}
          data-testid={"site-to-site-actions"}
        >
          <MoreVertical size={16} className={"shrink-0"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-auto"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

const MenuItem = ({
  icon,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem> & {
  icon: React.ReactNode;
}) => (
  <DropdownMenuItem {...props}>
    <div className={"flex gap-3 items-center"}>
      {icon}
      {children}
    </div>
  </DropdownMenuItem>
);

const ConnectionActions = ({ row }: { row: Row }) => {
  const { permission } = usePermissions();
  const { openAddPolicy, openDeployRoutingPeer, deleteConnection } =
    useSiteToSite();
  const [a, b] = row.networks;
  return (
    <RowMenu label={`Connection between ${a?.name ?? ""} and ${b?.name ?? ""}`}>
      <MenuItem
        icon={<PlusCircle size={14} className={"shrink-0"} />}
        onClick={() => openAddPolicy(row)}
        disabled={!permission.policies.create}
      >
        Add Policy
      </MenuItem>
      <MenuItem
        icon={<ServerIcon size={14} className={"shrink-0"} />}
        onClick={() => openDeployRoutingPeer(row.networks)}
        disabled={!permission.networks.update}
      >
        Deploy Routing Peer
      </MenuItem>
      <DropdownMenuSeparator />
      <MenuItem
        icon={<Trash2 size={14} className={"shrink-0"} />}
        onClick={() => void deleteConnection(row)}
        variant={"danger"}
        disabled={!permission.policies.delete}
      >
        Delete Policies
      </MenuItem>
    </RowMenu>
  );
};

const columns: ColumnDef<Row>[] = [
  {
    id: "network_a",
    accessorFn: (row) => row.search,
    header: ({ column }) => (
      <DataTableHeader column={column} className={"pl-12"}>
        Network A
      </DataTableHeader>
    ),
    meta: { className: COLUMN.first },
    sortingFn: "text",
    cell: ({ row }) => <FirstNetworkCell row={row.original} />,
  },
  {
    id: "network_b",
    accessorFn: (row) => row.networks[1]?.name ?? "",
    header: ({ column }) => (
      <DataTableHeader column={column} className={"pl-3"}>
        Network B
      </DataTableHeader>
    ),
    meta: { className: COLUMN.second },
    sortingFn: "text",
    cell: ({ row }) => <NetworkCell network={row.original.networks[1]} />,
  },
  {
    id: "links",
    accessorFn: (row) => row.links.length,
    header: ({ column }) => (
      <DataTableHeader column={column}>Links</DataTableHeader>
    ),
    meta: { className: COLUMN.count },
    cell: ({ row }) => (
      <div className={"flex justify-center"}>
        <Badge variant={"gray"} useHover={false} className={"w-fit"}>
          {plural(row.original.links.length, "Link")}
        </Badge>
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    meta: { className: COLUMN.actions },
    cell: ({ row }) => <ConnectionActions row={row.original} />,
  },
];

const LinkEnd = ({ resource }: { resource: SiteLink["a"] }) => (
  <div className={"flex flex-col items-start gap-1.5 min-w-0"}>
    <ResourceBadge resource={resource} className={"max-w-full"} />
    <span className={"font-mono text-xs text-nb-gray-400 truncate max-w-full"}>
      {resource.address}
    </span>
  </div>
);

const LinkPolicies = ({ link }: { link: SiteLink }) => {
  const { permission } = usePermissions();
  const { openEditPolicy, openAddLinkPolicy } = useSiteToSite();
  return (
    <PolicyCountBadge
      policies={link.policies}
      canConfigure={!!permission.policies.update}
      onSelectPolicy={openEditPolicy}
      onConfigure={() => openAddLinkPolicy(link)}
      configureLabel={"Add policy"}
    />
  );
};

const LinkActions = ({ link }: { link: SiteLink }) => {
  const { permission } = usePermissions();
  const { setLinkEnabled, deleteLink } = useSiteToSite();
  return (
    <RowMenu label={"Link actions"}>
      <MenuItem
        icon={<Power size={14} className={"shrink-0"} />}
        onClick={() => setLinkEnabled(link, !link.enabled)}
        disabled={!permission.policies.update}
      >
        {link.enabled ? "Disable Policies" : "Enable Policies"}
      </MenuItem>
      <DropdownMenuSeparator />
      <MenuItem
        icon={<Trash2 size={14} className={"shrink-0"} />}
        onClick={() => void deleteLink(link)}
        variant={"danger"}
        disabled={!permission.policies.delete}
      >
        Delete Policies
      </MenuItem>
    </RowMenu>
  );
};

const linkColumns: ColumnDef<SiteLink & { id: string }>[] = [
  {
    id: "link_a",
    header: ({ column }) => (
      <div className={"relative"}>
        <DataTableHeader column={column} sorting={false} className={"pl-12"}>
          Link A
        </DataTableHeader>
        <OnDirectionLine>
          <DataTableHeader column={column} sorting={false}>
            Direction
          </DataTableHeader>
        </OnDirectionLine>
      </div>
    ),
    meta: { className: COLUMN.first },
    cell: ({ row }) => (
      <div className={"relative flex items-center min-h-[52px]"}>
        <div className={"pl-12 min-w-0 max-w-[calc(50%-24px)]"}>
          <LinkEnd resource={row.original.a} />
        </div>
        <OnDirectionLine>
          <PolicyDirectionBadge
            bidirectional={row.original.bidirectional}
            reverse={row.original.reverse}
            className={"py-1.5"}
          />
        </OnDirectionLine>
      </div>
    ),
  },
  {
    id: "link_b",
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false} className={"pl-3"}>
        Link B
      </DataTableHeader>
    ),
    meta: { className: COLUMN.second },
    cell: ({ row }) => (
      <div className={"pl-3 min-w-0"}>
        <LinkEnd resource={row.original.b} />
      </div>
    ),
  },
  {
    id: "policies",
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        Policies
      </DataTableHeader>
    ),
    meta: { className: COLUMN.count },
    cell: ({ row }) => (
      <div className={"flex justify-center"}>
        <LinkPolicies link={row.original} />
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    meta: { className: COLUMN.actions },
    cell: ({ row }) => <LinkActions link={row.original} />,
  },
];

const LinksTable = ({ row }: { row: Row }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const data = useMemo(
    () => row.links.map((l) => ({ ...l, id: l.key })),
    [row.links],
  );
  return (
    <DataTable
      uniqueKey={row.id}
      keepStateInLocalStorage={false}
      tableClassName={cn("mt-0", TABLE_LAYOUT)}
      tableCellClassName={CELL_PADDING}
      tableHeadClassName={CELL_PADDING}
      minimal={true}
      showSearchAndFilters={false}
      className={"bg-nb-gray-960 py-2"}
      text={"Links"}
      initialPageSize={data.length}
      manualPagination={true}
      sorting={sorting}
      setSorting={setSorting}
      rowClassName={(r) => (r.original.enabled ? "" : "opacity-50")}
      columns={linkColumns}
      data={data}
    />
  );
};

type Props = {
  data?: SiteToSiteConnection[];
  isLoading: boolean;
};

export default function SiteToSiteTable({ data, isLoading }: Readonly<Props>) {
  const path = usePathname();
  const {
    networks,
    policies,
    resources,
    isLoading: contextLoading,
  } = useSiteToSite();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "network_a", desc: false }],
  );

  const rows = useMemo<Row[] | undefined>(
    () =>
      data?.map((connection) => {
        const rowNetworks = connectionNetworks(connection, networks);
        const links = connectionLinks(
          connection,
          policies,
          networks,
          resources,
        );
        const search = [
          ...rowNetworks.map((n) => n.name),
          ...links.flatMap((l) => [
            l.a.name,
            l.a.address,
            l.b.name,
            l.b.address,
            ...l.policies.map((p) => p.name),
          ]),
        ].join(" ");
        return {
          ...connection,
          id: connectionKey(connection),
          networks: rowNetworks,
          links,
          search,
        };
      }),
    [data, networks, policies, resources],
  );

  return (
    <DataTable
      tableClassName={TABLE_LAYOUT}
      tableCellClassName={CELL_PADDING}
      tableHeadClassName={CELL_PADDING}
      isLoading={isLoading || contextLoading}
      text={"Site-to-Site Connections"}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      data={rows}
      initialPageSize={25}
      showResetFilterButton={false}
      searchPlaceholder={"Search by network, resource or policy..."}
      rowClassName={(row) => (row.original.enabled ? "" : "opacity-50")}
      renderExpandedRow={(row) =>
        row.links.length > 0 ? <LinksTable row={row} /> : undefined
      }
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
          title={"Create New Site-to-Site Connection"}
          description={
            "It looks like you don't have any site-to-site connections yet. Connect two networks so hosts in one can reach resources in the other."
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
                Site-to-Site
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() =>
        rows &&
        rows.length > 0 && (
          <div className={cn("gap-x-4 ml-auto flex")}>
            <AddConnectionButton />
          </div>
        )
      }
    />
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
