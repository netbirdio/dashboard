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
import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  // Fits the widest network or link on the first side (useFirstColumnFit),
  // so the direction column takes what is left before the second network
  // and its arrow sits midway between the two.
  first: "w-[var(--s2s-first,34%)]",
  // Centered: the header's tooltip wrapper is inline, so only text-align
  // moves it; the cells center their content the same way.
  direction: "text-center",
  second: "w-[30%]",
  count: "w-[140px] text-center",
  actions: "w-[88px]",
};

const FIRST_COLUMN_VAR = "--s2s-first";
const FIRST_COLUMN_MIN = 240;
const FIRST_COLUMN_MAX = 440;
// The cell's horizontal padding (CELL_PADDING) on both sides.
const CELL_PADDING_X = 32;

/**
 * Measures the first side's entries, connection rows and link rows alike,
 * and sets the first column's width on the container both tables share.
 * Rows expand inside the table, so a DOM observer re-measures them.
 */
const useFirstColumnFit = (ref: React.RefObject<HTMLDivElement | null>) => {
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const measure = () => {
      let widest = 0;
      container
        .querySelectorAll<HTMLElement>("[data-s2s-first]")
        .forEach((n) => {
          const trim = Number(
            n.querySelector<HTMLElement>("[data-s2s-trim]")?.dataset.s2sTrim,
          );
          widest = Math.max(
            widest,
            n.getBoundingClientRect().width - (trim || 0),
          );
        });
      if (!widest) return;
      const width = Math.min(
        FIRST_COLUMN_MAX,
        Math.max(FIRST_COLUMN_MIN, Math.ceil(widest) + CELL_PADDING_X),
      );
      container.style.setProperty(FIRST_COLUMN_VAR, `${width}px`);
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(container, { childList: true, subtree: true });
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [ref]);
};

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
    <div
      className={"flex items-center gap-2 min-w-0"}
      // The square keeps room for its hover arrow; it may spill into the
      // empty direction cell, so it doesn't count toward the column width.
      data-s2s-trim={online === 0 && permission.networks.update ? 0 : 56}
    >
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
  <div data-s2s-first={true} className={"flex items-center gap-4 w-max"}>
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
    id: "direction",
    header: "",
    meta: { className: COLUMN.direction },
    cell: () => null,
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
      <DataTableHeader column={column} sorting={false} className={"pl-12"}>
        Link A
      </DataTableHeader>
    ),
    meta: { className: COLUMN.first },
    cell: ({ row }) => (
      <div data-s2s-first={true} className={"pl-12 w-max"}>
        <LinkEnd resource={row.original.a} />
      </div>
    ),
  },
  {
    id: "direction",
    header: ({ column }) => (
      <DataTableHeader column={column} sorting={false}>
        Direction
      </DataTableHeader>
    ),
    meta: { className: COLUMN.direction },
    // Centered so the arrow sits midway between the two resources.
    cell: ({ row }) => (
      <div className={"flex justify-center"}>
        <PolicyDirectionBadge
          bidirectional={row.original.bidirectional}
          reverse={row.original.reverse}
          className={"py-1.5"}
        />
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
  const containerRef = useRef<HTMLDivElement>(null);
  useFirstColumnFit(containerRef);
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
    <div ref={containerRef}>
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
    </div>
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
