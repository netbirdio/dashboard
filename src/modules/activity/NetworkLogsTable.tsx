"use client";

import ButtonGroup from "@components/ButtonGroup";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import type { ColumnDef, SortingState, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { NetworkLog, NetworkLogEndpoint } from "@/interfaces/NetworkLog";

type NetworkLogClientGroup = {
  id: string;
  client: NetworkLogEndpoint;
  user: NetworkLog["user"];
  latestTimestamp: string;
  flowCount: number;
  txBytes: number;
  rxBytes: number;
  txPackets: number;
  rxPackets: number;
  protocols: number[];
  destinations: string[];
  logs: NetworkLog[];
};

const protocolName = (
  protocol: number,
  t: (
    key:
      | "networkLogs.protocol.icmp"
      | "networkLogs.protocol.tcp"
      | "networkLogs.protocol.udp"
      | "networkLogs.protocol.sctp",
  ) => string,
) => {
  switch (protocol) {
    case 1:
      return t("networkLogs.protocol.icmp");
    case 6:
      return t("networkLogs.protocol.tcp");
    case 17:
      return t("networkLogs.protocol.udp");
    case 132:
      return t("networkLogs.protocol.sctp");
    default:
      return String(protocol);
  }
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
};

const formatEndpoint = (endpoint: NetworkLogEndpoint) => {
  if (!endpoint.address) return endpoint.name || "-";
  return endpoint.name ? `${endpoint.name} (${endpoint.address})` : endpoint.address;
};

const latestEventTimestamp = (log: NetworkLog) => log.events[0]?.timestamp ?? "";

const groupLogsByClient = (logs?: NetworkLog[]): NetworkLogClientGroup[] => {
  const groups = new Map<string, NetworkLogClientGroup>();

  for (const log of logs ?? []) {
    // 按账户名和设备名称分组
    const clientKey = `${log.user.name || log.user.email}-${log.source.name || log.source.address}`;
    const existing = groups.get(clientKey);
    const timestamp = latestEventTimestamp(log);

    if (!existing) {
      groups.set(clientKey, {
        id: clientKey,
        client: log.source,
        user: log.user,
        latestTimestamp: timestamp,
        flowCount: 1,
        txBytes: log.tx_bytes,
        rxBytes: log.rx_bytes,
        txPackets: log.tx_packets,
        rxPackets: log.rx_packets,
        protocols: [log.protocol],
        destinations: [formatEndpoint(log.destination)],
        logs: [log],
      });
      continue;
    }

    existing.flowCount += 1;
    existing.txBytes += log.tx_bytes;
    existing.rxBytes += log.rx_bytes;
    existing.txPackets += log.tx_packets;
    existing.rxPackets += log.rx_packets;
    existing.logs.push(log);

    if (!existing.protocols.includes(log.protocol)) {
      existing.protocols.push(log.protocol);
    }

    const destination = formatEndpoint(log.destination);
    if (!existing.destinations.includes(destination)) {
      existing.destinations.push(destination);
    }

    if (dayjs(timestamp).isAfter(dayjs(existing.latestTimestamp))) {
      existing.latestTimestamp = timestamp;
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    dayjs(b.latestTimestamp).valueOf() - dayjs(a.latestTimestamp).valueOf(),
  );
};

const renderEventTimeline = (log: NetworkLog) => {
  if (!log.events.length) return "-";
  return log.events
    .map((event) => `${dayjs(event.timestamp).format("HH:mm:ss")} ${event.type}`)
    .join(" / ");
};

function NetworkLogDetails({ group }: Readonly<{ group: NetworkLogClientGroup }>) {
  const { t } = useI18n();
  const sortedLogs = [...group.logs].sort(
    (a, b) => dayjs(latestEventTimestamp(b)).valueOf() - dayjs(latestEventTimestamp(a)).valueOf(),
  );

  return (
    <div className="border-y border-nb-gray-900 bg-nb-gray-950/60 px-8 py-5">
      <div className="mb-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div>
          <div className="text-xs text-nb-gray-300">{t("networkLogs.client")}</div>
          <div className="mt-1 text-white">{formatEndpoint(group.client)}</div>
        </div>
        <div>
          <div className="text-xs text-nb-gray-300">{t("networkLogs.user")}</div>
          <div className="mt-1 text-white">{group.user.name || group.user.email || "-"}</div>
        </div>
        <div>
          <div className="text-xs text-nb-gray-300">{t("networkLogs.packets")}</div>
          <div className="mt-1 text-white">
            {t("networkLogs.tx")} {group.txPackets} / {t("networkLogs.rx")} {group.rxPackets}
          </div>
        </div>
        <div>
          <div className="text-xs text-nb-gray-300">{t("networkLogs.totalTraffic")}</div>
          <div className="mt-1 text-white">
            {t("networkLogs.tx")} {formatBytes(group.txBytes)} / {t("networkLogs.rx")}{" "}
            {formatBytes(group.rxBytes)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-nb-gray-900">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-nb-gray-930 text-xs text-nb-gray-300">
            <tr>
              <th className="px-4 py-3 font-medium">{t("networkLogs.time")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.protocol")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.direction")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.source")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.destination")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.packets")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.traffic")}</th>
              <th className="px-4 py-3 font-medium">{t("networkLogs.events")}</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log) => (
              <tr key={log.flow_id} className="border-t border-nb-gray-900 text-nb-gray-100">
                <td className="whitespace-nowrap px-4 py-3">
                  {dayjs(latestEventTimestamp(log)).format("YYYY/MM/DD HH:mm:ss")}
                </td>
                <td className="px-4 py-3">{protocolName(log.protocol, t)}</td>
                <td className="px-4 py-3">{log.direction || "-"}</td>
                <td className="px-4 py-3">{formatEndpoint(log.source)}</td>
                <td className="px-4 py-3">{formatEndpoint(log.destination)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {t("networkLogs.tx")} {log.tx_packets} / {t("networkLogs.rx")} {log.rx_packets}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {t("networkLogs.tx")} {formatBytes(log.tx_bytes)} / {t("networkLogs.rx")}{" "}
                  {formatBytes(log.rx_bytes)}
                </td>
                <td className="px-4 py-3">{renderEventTimeline(log)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function NetworkLogsTable({ headingTarget }: Readonly<Props>) {
  const { t } = useI18n();
  const {
    data: rawData,
    isLoading,
    mutate,
    setFilter,
    getFilter,
  } = useServerPagination<NetworkLog[]>();

  const dateRange = useMemo<DateRange | undefined>(() => {
    const startDate = getFilter("start_date");
    const endDate = getFilter("end_date");
    if (!startDate && !endDate) return undefined;
    return {
      from: startDate ? dayjs(startDate).toDate() : undefined,
      to: endDate ? dayjs(endDate).toDate() : undefined,
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

  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const groupedData = useMemo(() => groupLogsByClient(rawData), [rawData]);
  const columns = useMemo<ColumnDef<NetworkLogClientGroup>[]>(
    () => [
      {
        id: "expand",
        header: "",
        enableSorting: false,
        cell: () => (
          <div className="flex items-center text-nb-gray-300">
            <ChevronRightIcon
              size={16}
              className="group-data-[accordion=opened]/accordion:hidden shrink-0"
            />
            <ChevronDown
              size={16}
              className="group-data-[accordion=closed]/accordion:hidden shrink-0"
            />
          </div>
        ),
      },
      {
        id: "timestamp",
        accessorFn: (row) => row.latestTimestamp,
        header: ({ column }) => (
          <DataTableHeader column={column} name="timestamp">
            {t("networkLogs.latestTime")}
          </DataTableHeader>
        ),
        cell: ({ row }) => dayjs(row.original.latestTimestamp).format("YYYY/MM/DD HH:mm:ss"),
      },
      {
        id: "user",
        accessorFn: (row) => `${row.user.name} ${row.user.email}`.trim(),
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("networkLogs.user")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.user.name || row.original.user.email}</span>
            {row.original.user.name && (
              <span className="text-xs text-nb-gray-300">{row.original.user.email}</span>
            )}
          </div>
        ),
      },
      {
        id: "device",
        accessorFn: (row) => formatEndpoint(row.client),
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("networkLogs.client")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.client.name || row.original.client.address}</span>
            {row.original.client.name && (
              <span className="text-xs text-nb-gray-300">{row.original.client.address}</span>
            )}
          </div>
        ),
      },
      {
        id: "protocol",
        accessorFn: (row) => row.protocols.map((protocol) => protocolName(protocol, t)).join(", "),
        header: ({ column }) => (
          <DataTableHeader column={column} name="protocol">
            {t("networkLogs.protocol")}
          </DataTableHeader>
        ),
        cell: ({ row }) => row.original.protocols.map((protocol) => protocolName(protocol, t)).join(", "),
      },
      {
        id: "destinations",
        accessorFn: (row) => row.destinations.join(" "),
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("networkLogs.destination")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <div className="max-w-[420px] truncate">
            {row.original.destinations.slice(0, 3).join(", ")}
            {row.original.destinations.length > 3 &&
              t("networkLogs.moreDestinations", { count: row.original.destinations.length })}
          </div>
        ),
      },
      {
        id: "flowCount",
        accessorKey: "flowCount",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("networkLogs.flowCount")}</DataTableHeader>
        ),
        cell: ({ row }) => t("networkLogs.flowCountValue", { count: row.original.flowCount }),
      },
      {
        id: "traffic",
        accessorFn: (row) => row.txBytes + row.rxBytes,
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("networkLogs.traffic")}</DataTableHeader>
        ),
        cell: ({ row }) =>
          `${t("networkLogs.tx")} ${formatBytes(row.original.txBytes)} / ${t(
            "networkLogs.rx",
          )} ${formatBytes(row.original.rxBytes)}`,
      },
    ],
    [t],
  );

  const pageCount = useMemo(() => Math.ceil(groupedData.length / pageSize), [groupedData.length, pageSize]);

  return (
    <DataTable
      data={groupedData}
      headingTarget={headingTarget}
      isLoading={isLoading}
      inset={false}
      text={t("networkLogs.title")}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      pagination={{ pageIndex, pageSize }}
      onPaginationChange={setPagination}
      pageCount={pageCount}
      totalRecords={groupedData.length}
      manualPagination={true}
      serverSidePagination={false}
      keepStateInLocalStorage={false}
      manualFiltering={false}
      hasServerSideFilters={false}
      searchPlaceholder={t("networkLogs.searchPlaceholder")}
      renderExpandedRow={(group) => <NetworkLogDetails group={group} />}
      getStartedCard={
        <GetStartedTest
          icon={<ActivityIcon size={20} />}
          title={t("networkLogs.emptyTitle")}
          description={t("networkLogs.emptyDescription")}
        />
      }
      rightSide={(table) => (
        <div className="flex items-center gap-2">
          <DatePickerWithRange value={dateRange} onChange={handleDateFilterChange} />
          <ButtonGroup>
            <DataTableRefreshButton
              isDisabled={groupedData.length === 0 || isLoading}
              onClick={() => {
                mutate().then();
              }}
            />
            <DataTableRowsPerPage
              table={table}
              disabled={groupedData.length === 0}
              rowsSelection={[20, 50, 100, 200]}
            />
          </ButtonGroup>
        </div>
      )}
    />
  );
}
