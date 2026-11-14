import Badge from "@components/Badge";
import Button from "@components/Button";
import Card from "@components/Card";
import { HelpTooltip } from "@components/HelpTooltip";
import Paragraph from "@components/Paragraph";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import NoResults from "@components/ui/NoResults";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { isEmpty } from "lodash";
import { GlobeIcon, Info } from "lucide-react";
import React, { useMemo, useState } from "react";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import { useCountries } from "@/contexts/CountryProvider";
import type { ActivityEvent } from "@/interfaces/ActivityEvent";
import {
  connectionLocationText,
  peerConnectionEvents,
} from "./connectionHistory";

dayjs.extend(utc);

// The location text depends on the loaded country list, so it is computed when the
// rows are built: the table caches accessor values until its data changes.
type ConnectionRow = ActivityEvent & { location: string };

const columns: ColumnDef<ConnectionRow>[] = [
  {
    accessorKey: "timestamp",
    sortingFn: "datetime",
    header: ({ column }) => (
      <DataTableHeader column={column}>Time (UTC)</DataTableHeader>
    ),
    cell: ({ row }) => (
      <time dateTime={row.original.timestamp}>
        {dayjs(row.original.timestamp).utc().format("YYYY-MM-DD HH:mm:ss")}
      </time>
    ),
  },
  {
    accessorKey: "activity",
    header: ({ column }) => (
      <DataTableHeader column={column}>Event</DataTableHeader>
    ),
    cell: ({ row }) => (
      <div className="flex items-center">
        <Badge
          variant={
            row.original.activity_code === "peer.connect" ? "green" : "gray"
          }
        >
          {row.original.activity_code === "peer.connect"
            ? "Connected"
            : "Disconnected"}
        </Badge>
      </div>
    ),
  },
  {
    id: "source_ip",
    accessorFn: (event) => event.meta?.location_connection_ip,
    header: ({ column }) => (
      <DataTableHeader column={column}>Source IP</DataTableHeader>
    ),
    cell: ({ row, getValue }) =>
      getValue<string>() ||
      (row.original.activity_code === "peer.disconnect" ? "—" : "Unavailable"),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableHeader column={column}>Location</DataTableHeader>
    ),
    cell: ({ row, getValue }) => {
      const location = getValue<string>();
      if (!location) {
        return row.original.activity_code === "peer.disconnect"
          ? "—"
          : "Unknown";
      }
      const code: string = row.original.meta?.location_country_code;
      return (
        <div className="flex items-center gap-2">
          <span aria-hidden={true} className="flex items-center">
            {isEmpty(code) ? (
              <GlobeIcon size={12} className="text-nb-gray-300" />
            ) : (
              <RoundedFlag country={code} size={12} />
            )}
          </span>
          {location}
        </div>
      );
    },
  },
];

export function PeerConnectionHistory({ peerID }: { peerID: string }) {
  const { data, isLoading, error, mutate } = useFetchApi<ActivityEvent[]>(
    "/events/audit",
    true,
  );
  const events = useMemo(
    () => peerConnectionEvents(data ?? [], peerID),
    [data, peerID],
  );

  return (
    <PeerConnectionHistoryContent
      events={events}
      isLoading={isLoading}
      hasError={!!error}
      onRefresh={() => void mutate()}
    />
  );
}

export function PeerConnectionHistoryContent({
  events,
  isLoading = false,
  hasError = false,
  onRefresh,
}: {
  events: ActivityEvent[];
  isLoading?: boolean;
  hasError?: boolean;
  onRefresh: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const { countries } = useCountries();
  const rows = useMemo<ConnectionRow[]>(
    () =>
      events.map((event) => ({
        ...event,
        location: connectionLocationText(event.meta, countries),
      })),
    [events, countries],
  );

  return (
    <div className="pb-10 px-8">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-1.5">
          <Paragraph>
            View when this peer connects to and disconnects from Management.
          </Paragraph>
          <HelpTooltip
            side="bottom"
            content={
              <div className="space-y-2">
                <p>
                  Timestamps are in UTC and reflect when Management observed the
                  change. These events do not indicate tunnel health or traffic
                  flow.
                </p>
                <p>
                  Source IP is the address Management observed and may be shared
                  by devices behind NAT. Location is looked up from that address
                  when geolocation is available.
                </p>
                <p>
                  History comes from the latest 10,000 account activity events.
                  Events may be missing while Management is unavailable or
                  logging is disabled.
                </p>
              </div>
            }
          >
            <button type="button" aria-label="About connection history">
              <Info size={14} />
            </button>
          </HelpTooltip>
        </div>
      </div>
      {hasError ? (
        <div
          role="alert"
          className="py-6"
          data-testid="peer-connection-history-error"
        >
          <Paragraph>Unable to load connection history.</Paragraph>
          <Button
            variant="secondary"
            onClick={onRefresh}
            data-testid="peer-connection-history-retry"
          >
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          wrapperComponent={Card}
          wrapperProps={{ className: "mt-6 w-full" }}
          minimal={true}
          inset={false}
          tableClassName="mt-0"
          paginationPaddingClassName="px-0 pt-8"
          keepStateInLocalStorage={false}
          autoResetPageIndex={true}
          text="Connection History"
          columns={columns}
          data={rows}
          isLoading={isLoading}
          sorting={sorting}
          setSorting={setSorting}
          initialPageSize={25}
          searchPlaceholder="Search events, source IPs or locations..."
          getStartedCard={
            <NoResults
              className="py-4"
              title="No recent connection events"
              description="No connection events for this peer were found in the available activity history. New connections appear here when activity logging is enabled."
            />
          }
        >
          {(table) => (
            <>
              <DataTableRowsPerPage
                table={table}
                disabled={events.length === 0}
              />
              <DataTableRefreshButton onClick={onRefresh} />
            </>
          )}
        </DataTable>
      )}
    </div>
  );
}
