import Button from "@components/Button";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import {
  formatPeerResourceChip,
  PeerResourceOption,
  PeerResourcePicker,
} from "@components/table/filters/PeerResourcePicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import useFetchApi from "@utils/api";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ArrowLeftRightIcon, ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  getTrafficEventCounts,
  TrafficEvent,
  TrafficEventDirection,
  TrafficEventType,
} from "@/cloud/traffic-events/interfaces/TrafficEvent";
import { TrafficEventsBytesCell } from "@/cloud/traffic-events/table/TrafficEventsBytesCell";
import { TrafficEventsDetailRow } from "@/cloud/traffic-events/table/TrafficEventsDetailRow";
import { TrafficEventsMachineCell } from "@/cloud/traffic-events/table/TrafficEventsMachineCell";
import { TrafficEventsPortCell } from "@/cloud/traffic-events/table/TrafficEventsPortCell";
import { TrafficEventsReporterCell } from "@/cloud/traffic-events/table/TrafficEventsReporterCell";
import { TrafficEventsTextCell } from "@/cloud/traffic-events/table/TrafficEventsTextCell";
import { TrafficEventsTimeCell } from "@/cloud/traffic-events/table/TrafficEventsTimeCell";
import { TRAFFIC_EVENTS_DOC_LINK } from "@/cloud/traffic-events/TrafficEventSetting";
import { parseAddressPort } from "@/cloud/traffic-events/utils/parseAddress";
import { usePeers } from "@/contexts/PeersProvider";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { NetworkResource } from "@/interfaces/Network";

export const getTrafficEventTypeText = (
  t: TrafficEventType,
  isP2P: boolean,
  direction: TrafficEventDirection,
) => {
  const name = isP2P ? "P2P" : "Routed";
  const isInbound = direction === TrafficEventDirection.INGRESS;
  const directionText = isInbound ? "(inbound)" : "(outbound)";

  switch (t) {
    case TrafficEventType.CONNECTED:
      return `${name} connection started ${directionText}`;
    case TrafficEventType.BLOCKED:
      return `${name} connection blocked ${directionText}`;
    case TrafficEventType.STOPPED:
      return `${name} connection stopped ${directionText}`;
    default:
      return "Unknown";
  }
};

export const TrafficEventsTableColumns: ColumnDef<TrafficEvent>[] = [
  {
    id: "timestamp",
    header: ({ column }) => (
      <DataTableHeader column={column}>Time</DataTableHeader>
    ),
    cell: ({ row }) => (
      <TrafficEventsTimeCell timestamp={row.original.events[0].timestamp} />
    ),
    accessorFn: (row) => row.events?.[0]?.timestamp ?? null,
    filterFn: "dateRange",
    enableGlobalFilter: false,
  },
  {
    id: "type",
    accessorKey: "type",
    accessorFn: (t) => {
      const isP2P =
        t.source.id === t.reporter_id || t.destination.id === t.reporter_id;
      return getTrafficEventTypeText(t.events[0].type, isP2P, t.direction);
    },
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Event</DataTableHeader>
    ),
    cell: ({ row }) => row.getValue("type"),
  },
  {
    id: "text",
    accessorKey: "type",
    accessorFn: (t) => {
      const isP2P =
        t.source.id === t.reporter_id || t.destination.id === t.reporter_id;
      return getTrafficEventTypeText(t.events[0].type, isP2P, t.direction);
    },
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Event</DataTableHeader>
    ),
    cell: ({ row }) => <TrafficEventsTextCell event={row.original} />,
    enableGlobalFilter: false,
  },
  {
    id: "source",
    accessorFn: (row) => row.source.address,
    header: ({ column }) => (
      <DataTableHeader column={column}>Source</DataTableHeader>
    ),
    cell: ({ row }) => (
      <TrafficEventsMachineCell event={row.original} isSource={true} />
    ),
  },
  {
    id: "protocol",
    accessorFn: (row) => row.protocol,
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Protocol & Port</DataTableHeader>
    ),
    cell: ({ row }) => <TrafficEventsPortCell event={row.original} />,
  },
  {
    id: "source_port",
    accessorFn: (row) => {
      return parseAddressPort(row?.source.address).port;
    },
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "destination_port",
    accessorFn: (row) => {
      return parseAddressPort(row?.destination.address).port;
    },
    filterFn: "arrIncludesSomeExact",
  },
  {
    id: "destination",
    accessorFn: (row) => row.destination.address,
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Destination</DataTableHeader>
    ),
    cell: ({ row }) => {
      return <TrafficEventsMachineCell event={row.original} isSource={false} />;
    },
  },

  {
    id: "bytes_all",
    accessorKey: "tx_bytes",
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Traffic</DataTableHeader>
    ),
    cell: ({ row }) => {
      return <TrafficEventsBytesCell event={row.original} />;
    },
    enableGlobalFilter: false,
  },
  {
    id: "bytes_inbound",
    accessorKey: "tx_bytes",
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Traffic</DataTableHeader>
    ),
    cell: ({ row }) => {
      return (
        <div className={"2xl:min-w-[200px] ml-auto"}>
          <TrafficEventsBytesCell event={row.original} showOutbound={false} />
        </div>
      );
    },
    enableGlobalFilter: false,
  },
  {
    id: "bytes_outbound",
    accessorKey: "tx_bytes",
    filterFn: "arrIncludesSomeExact",
    header: ({ column }) => (
      <DataTableHeader column={column}>Traffic</DataTableHeader>
    ),
    cell: ({ row }) => {
      return (
        <div className={"2xl:min-w-[200px] ml-auto"}>
          <TrafficEventsBytesCell event={row.original} showInbound={false} />
        </div>
      );
    },
    enableGlobalFilter: false,
  },
  {
    id: "reporter",
    accessorKey: "reporter_id",
    header: ({ column }) => (
      <DataTableHeader column={column}>Router</DataTableHeader>
    ),
    cell: ({ row }) => <TrafficEventsReporterCell event={row.original} />,
  },
  {
    id: "policy",
    accessorFn: (row) => row.policy?.name,
  },
  {
    id: "user",
    accessorKey: "user_email",
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
  isSettingEnabled: boolean;
};

export default function TrafficEventsTable({
  headingTarget,
  isSettingEnabled,
}: Readonly<Props>) {
  const router = useRouter();
  const { users } = useUsers();
  const { peers } = usePeers();
  // Resources back the Resources tab of the source/destination picker. Errors
  // are ignored so a missing networks permission just yields an empty tab.
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
    true,
  );
  const {
    data,
    isLoading,
    mutate,
    setFilter,
    getFilter,
    ...paginationProps
  } = useServerPagination<TrafficEvent[]>();

  // `data` may resolve to a non-array (e.g. an error body) on locked /
  // self-hosted deployments; guard so `.map` never throws. Rows are keyed by
  // flow_id.
  const events = useMemo(() => {
    if (!Array.isArray(data)) return undefined;
    return data.map((event) => ({ ...event, id: event.flow_id }));
  }, [data]);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);

  const userOptions = useMemo<PeerResourceOption[]>(() => {
    const map = new Map<string, PeerResourceOption>();
    for (const user of users ?? []) {
      if (!user.id || !user.email || user.is_service_user) continue;
      map.set(user.id, {
        id: user.id,
        name: user.name || user.email,
        sublabel: user.email,
        kind: "user" as const,
      });
    }
    return Array.from(map.values());
  }, [users]);

  const dateRange = useMemo<DateRange | undefined>(() => {
    const start = getFilter("start_date");
    const end = getFilter("end_date");
    if (!start && !end) return undefined;
    return {
      from: start ? dayjs(start).toDate() : undefined,
      to: end ? dayjs(end).toDate() : undefined,
    };
  }, [getFilter]);

  const handleDateFilterChange = useCallback(
    (range?: DateRange) => {
      setFilter(
        "start_date",
        range?.from ? dayjs(range.from).toISOString() : undefined,
      );
      setFilter(
        "end_date",
        range?.to ? dayjs(range.to).toISOString() : undefined,
      );
    },
    [setFilter],
  );

  const peerOptions = useMemo<PeerResourceOption[]>(() => {
    return (peers ?? [])
      .filter((p) => p.id)
      .map((p) => ({
        id: p.id as string,
        name: p.name,
        sublabel: p.ip,
        kind: "peer" as const,
        connected: p.connected,
      }));
  }, [peers]);

  const resourceOptions = useMemo<PeerResourceOption[]>(() => {
    return (resources ?? [])
      .filter((r) => r.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        sublabel: r.address,
        kind: "resource" as const,
        resourceType: r.type,
      }));
  }, [resources]);

  // Combined lookups so a chip can resolve a selected id to a name. The Source
  // filter also resolves users (its third tab); Destination is peers/resources.
  const destinationChipOptions = useMemo<PeerResourceOption[]>(
    () => [...peerOptions, ...resourceOptions],
    [peerOptions, resourceOptions],
  );
  const sourceChipOptions = useMemo<PeerResourceOption[]>(
    () => [...destinationChipOptions, ...userOptions],
    [destinationChipOptions, userOptions],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "source_id",
        label: "Source",
        renderPicker: (p) => (
          <PeerResourcePicker
            value={p.value as string | undefined}
            onChange={(next) => {
              p.onChange(next?.id);
              // Peers/resources filter by source_id; users by user_id. The two
              // API params are mutually exclusive within this merged control.
              if (!next) {
                setFilter("source_id", undefined);
                setFilter("user_id", undefined);
              } else if (next.kind === "user") {
                setFilter("user_id", next.id);
                setFilter("source_id", undefined);
              } else {
                setFilter("source_id", next.id);
                setFilter("user_id", undefined);
              }
            }}
            close={p.close}
            peers={peerOptions}
            resources={resourceOptions}
            users={userOptions}
          />
        ),
        formatChip: (v) =>
          formatPeerResourceChip(v as string | undefined, sourceChipOptions),
      },
      {
        id: "destination_id",
        label: "Destination",
        renderPicker: (p) => (
          <PeerResourcePicker
            value={p.value as string | undefined}
            onChange={(next) => {
              p.onChange(next?.id);
              setFilter("destination_id", next?.id ?? undefined);
            }}
            close={p.close}
            peers={peerOptions}
            resources={resourceOptions}
          />
        ),
        formatChip: (v) =>
          formatPeerResourceChip(
            v as string | undefined,
            destinationChipOptions,
          ),
      },
    ],
    [
      peerOptions,
      resourceOptions,
      userOptions,
      sourceChipOptions,
      destinationChipOptions,
      setFilter,
    ],
  );

  // Seed the column-filter chips from the active server query so the chips
  // match what is fetched. The date lives in its own picker, not a chip.
  const initialColumnFilters = useMemo<{ id: string; value: unknown }[]>(() => {
    const filters: { id: string; value: unknown }[] = [];
    // Source holds either a source_id (peer/resource) or a user_id (Users tab).
    const sourceId = getFilter("source_id");
    const userId = getFilter("user_id");
    if (sourceId) filters.push({ id: "source_id", value: sourceId });
    else if (userId) filters.push({ id: "source_id", value: userId });
    const destinationId = getFilter("destination_id");
    if (destinationId)
      filters.push({ id: "destination_id", value: destinationId });
    return filters;
  }, [getFilter]);

  // Hidden columns backing the Source / Destination filters. Filtering is
  // server-side, so these only need to exist for the filter adapter/chips to
  // read and write their value. Added locally so the shared column export stays
  // untouched (the peer tab reuses it).
  const columns = useMemo<ColumnDef<TrafficEvent>[]>(
    () => [
      ...TrafficEventsTableColumns,
      {
        id: "source_id",
        accessorFn: (row) => row.source.id,
        enableGlobalFilter: false,
      },
      {
        id: "destination_id",
        accessorFn: (row) => row.destination.id,
        enableGlobalFilter: false,
      },
    ],
    [],
  );

  const getStartedCard = !isSettingEnabled ? (
    <GetStartedTest
      icon={
        <SquareIcon
          icon={<ArrowLeftRightIcon className={"text-nb-gray-200"} size={20} />}
          color={"gray"}
          size={"large"}
        />
      }
      title={"Traffic Events"}
      description={
        "Traffic Events help you understand the network activity in your organization. " +
        "You can see which machines are connecting to each other, and what kind of traffic is flowing between them."
      }
      button={
        <Button
          variant={"primary"}
          onClick={() => router.push("/settings?tab=networks")}
        >
          Enable Traffic Events
        </Button>
      }
      learnMore={
        <>
          Learn more about
          <InlineLink href={TRAFFIC_EVENTS_DOC_LINK} target={"_blank"}>
            Traffic Events
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </>
      }
    />
  ) : (
    <GetStartedTest
      icon={
        <SquareIcon
          icon={<ArrowLeftRightIcon className={"text-nb-gray-200"} size={20} />}
          color={"gray"}
          size={"large"}
        />
      }
      title={"No traffic events yet"}
      description={
        "We haven't detected any traffic events yet. This could be because you just enabled the feature, or because there hasn't been any network activity."
      }
      learnMore={
        <>
          Learn more about
          <InlineLink href={TRAFFIC_EVENTS_DOC_LINK} target={"_blank"}>
            Traffic Events
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </>
      }
    />
  );

  // Keep the filter controls interactive whenever the feature is enabled, even
  // before any events exist, so filters can be configured and exercised on an
  // empty table.
  const filtersDisabled = !isSettingEnabled;

  return (
    <DataTable
      {...paginationProps}
      serverSidePagination={false}
      headingTarget={headingTarget}
      text={"Traffic Events"}
      isLoading={isLoading}
      tableCellClassName={"py-2"}
      sorting={sorting}
      setSorting={setSorting}
      rowClassName={"data-[accordion=opened]:!border-b-transparent"}
      renderExpandedRow={(e) => {
        const { isAggregated } = getTrafficEventCounts(e);
        if (isAggregated) {
          if (!e.policy?.id) return undefined;
          return <TrafficEventsDetailRow event={e} />;
        }
        if (e.events.length < 2) return undefined;
        return <TrafficEventsDetailRow event={e} />;
      }}
      columns={columns}
      initialFilters={initialColumnFilters}
      columnVisibility={{
        user: false,
        source_port: false,
        destination_port: false,
        bytes_inbound: false,
        bytes_outbound: false,
        type: false,
        timestamp: false,
        policy: false,
        source_id: false,
        destination_id: false,
      }}
      data={events}
      searchPlaceholder={"Search by ip, port, peer or resource..."}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      getStartedCard={getStartedCard}
    >
      {(table) => (
        <>
          <DatePickerWithRange
            value={dateRange}
            onChange={handleDateFilterChange}
            disabled={filtersDisabled}
          />

          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={filtersDisabled}
          />

          <DataTableRefreshButton
            isDisabled={filtersDisabled}
            onClick={() => mutate()}
          />
        </>
      )}
    </DataTable>
  );
}
