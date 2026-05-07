"use client";

import ButtonGroup from "@components/ButtonGroup";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import { Input } from "@components/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Globe2 } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { NetworkLog, NetworkLogEndpoint } from "@/interfaces/NetworkLog";

type DNSLogRow = {
  id: string;
  timestamp: string;
  user: NetworkLog["user"];
  device: NetworkLogEndpoint;
  domain: string;
  recordType: string;
  result: string;
  source: string;
  destination: string;
  flowCount: number;
};

const DNS_PORTS = new Set([53, 5353, 22054]);
const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "PTR", "SRV", "TXT"];

const latestEventTimestamp = (log: NetworkLog) => log.events[0]?.timestamp ?? "";

const normalizeList = (value?: string[] | string | null) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const endpointLabel = (endpoint: NetworkLogEndpoint) => {
  return endpoint.name || endpoint.dns_label || endpoint.address || "-";
};

const endpointAddress = (endpoint: NetworkLogEndpoint) => endpoint.address || "-";

const stripPort = (address?: string | null) => {
  if (!address) return "";
  const ipv6Match = address.match(/^\[(.*)]:(\d+)$/);
  if (ipv6Match) return ipv6Match[1];

  const lastColon = address.lastIndexOf(":");
  if (lastColon === -1) return address;

  const port = Number(address.slice(lastColon + 1));
  if (!Number.isFinite(port)) return address;

  return address.slice(0, lastColon);
};

const portFromAddress = (address?: string | null) => {
  if (!address) return undefined;
  const ipv6Match = address.match(/^\[.*]:(\d+)$/);
  if (ipv6Match) return Number(ipv6Match[1]);

  const lastColon = address.lastIndexOf(":");
  if (lastColon === -1) return undefined;

  const port = Number(address.slice(lastColon + 1));
  return Number.isFinite(port) ? port : undefined;
};

const isDNSFlow = (log: NetworkLog) => {
  if (
    log.dns ||
    log.dns_domain ||
    log.dns_query ||
    log.dns_query_name ||
    log.dns_answers ||
    log.dns_resolved_ips ||
    log.dns_result
  ) {
    return true;
  }

  const sourcePort = log.source_port ?? portFromAddress(log.source.address);
  const destinationPort =
    log.destination_port ?? log.dest_port ?? portFromAddress(log.destination.address);

  return log.protocol === 17 && (
    (sourcePort !== undefined && DNS_PORTS.has(sourcePort)) ||
    (destinationPort !== undefined && DNS_PORTS.has(destinationPort))
  );
};

const dnsDomain = (log: NetworkLog) => {
  return (
    log.dns?.domain ||
    log.dns?.query ||
    log.dns?.query_name ||
    log.dns_domain ||
    log.dns_query ||
    log.dns_query_name ||
    log.destination.dns_label ||
    log.destination.name ||
    "-"
  );
};

const dnsType = (log: NetworkLog) => {
  return (
    log.dns?.type ||
    log.dns?.query_type ||
    log.dns?.record_type ||
    log.dns_type ||
    log.dns_query_type ||
    log.dns_record_type ||
    "-"
  );
};

const dnsResult = (log: NetworkLog) => {
  const answers = [
    ...normalizeList(log.dns?.answers),
    ...normalizeList(log.dns?.resolved_ips),
    ...normalizeList(log.dns?.result),
    ...normalizeList(log.dns_answers),
    ...normalizeList(log.dns_resolved_ips),
    ...normalizeList(log.dns_result),
  ];

  if (answers.length > 0) return Array.from(new Set(answers)).join(", ");

  const destinationPort =
    log.destination_port ?? log.dest_port ?? portFromAddress(log.destination.address);
  if (destinationPort !== undefined && DNS_PORTS.has(destinationPort)) {
    return "-";
  }

  return stripPort(log.destination.address) || "-";
};

const toDNSRows = (logs?: NetworkLog[]) => {
  const groups = new Map<string, DNSLogRow>();

  for (const log of logs ?? []) {
    if (!isDNSFlow(log)) continue;

    const timestamp = latestEventTimestamp(log);
    const row: DNSLogRow = {
      id: log.flow_id,
      timestamp,
      user: log.user,
      device: log.source,
      domain: dnsDomain(log),
      recordType: dnsType(log),
      result: dnsResult(log),
      source: endpointAddress(log.source),
      destination: endpointAddress(log.destination),
      flowCount: 1,
    };

    const bucket = dayjs(timestamp).startOf("minute").minute(
      Math.floor(dayjs(timestamp).minute() / 5) * 5,
    );
    const key = [
      bucket.toISOString(),
      row.user.id || row.user.email,
      row.device.id || row.device.name || row.device.address,
      row.domain,
      row.recordType,
      row.result,
    ].join("|");

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, row);
      continue;
    }

    existing.flowCount += 1;
    if (dayjs(timestamp).isAfter(dayjs(existing.timestamp))) {
      existing.timestamp = timestamp;
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf(),
  );
};

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function DNSLogsTable({ headingTarget }: Readonly<Props>) {
  const { t } = useI18n();
  const {
    data: rawData,
    isLoading,
    mutate,
    setFilter,
    getFilter,
    globalFilter,
    onGlobalFilterChange,
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
      setFilter("start_date", range?.from ? dayjs(range.from).toISOString() : undefined);
      setFilter("end_date", range?.to ? dayjs(range.to).toISOString() : undefined);
    },
    [setFilter],
  );

  const dnsDomainFilter = getFilter("dns_domain") ?? "";
  const dnsTypeFilter = getFilter("dns_type") ?? "";

  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const rows = useMemo(() => toDNSRows(rawData), [rawData]);
  const columns = useMemo<ColumnDef<DNSLogRow>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (row) => row.timestamp,
        header: ({ column }) => (
          <DataTableHeader column={column} name="timestamp">
            {t("dnsLogs.time")}
          </DataTableHeader>
        ),
        cell: ({ row }) => dayjs(row.original.timestamp).format("YYYY/MM/DD HH:mm:ss"),
      },
      {
        id: "user",
        accessorFn: (row) => `${row.user.name} ${row.user.email}`.trim(),
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("dnsLogs.user")}</DataTableHeader>
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
        accessorFn: (row) => endpointLabel(row.device),
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("dnsLogs.device")}</DataTableHeader>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{endpointLabel(row.original.device)}</span>
            {row.original.device.address && (
              <span className="text-xs text-nb-gray-300">{row.original.device.address}</span>
            )}
          </div>
        ),
      },
      {
        id: "domain",
        accessorFn: (row) => row.domain,
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("dnsLogs.domain")}</DataTableHeader>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.domain}</span>,
      },
      {
        id: "recordType",
        accessorFn: (row) => row.recordType,
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("dnsLogs.type")}</DataTableHeader>
        ),
        cell: ({ row }) => row.original.recordType,
      },
      {
        id: "result",
        accessorFn: (row) => row.result,
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("dnsLogs.result")}</DataTableHeader>
        ),
        cell: ({ row }) => <span className="break-all">{row.original.result}</span>,
      },
      {
        id: "flowCount",
        accessorKey: "flowCount",
        header: ({ column }) => (
          <DataTableHeader column={column}>{t("dnsLogs.flowCount")}</DataTableHeader>
        ),
        cell: ({ row }) => row.original.flowCount,
      },
    ],
    [t],
  );

  const pageCount = useMemo(() => Math.ceil(rows.length / pageSize), [rows.length, pageSize]);

  return (
    <DataTable
      data={rows}
      headingTarget={headingTarget}
      isLoading={isLoading}
      inset={false}
      text={t("dnsLogs.title")}
      sorting={sorting}
      setSorting={setSorting}
      columns={columns}
      pagination={{ pageIndex, pageSize }}
      onPaginationChange={setPagination}
      pageCount={pageCount}
      totalRecords={rows.length}
      manualPagination={true}
      serverSidePagination={false}
      keepStateInLocalStorage={false}
      manualFiltering={true}
      hasServerSideFilters={true}
      globalFilter={globalFilter}
      onGlobalFilterChange={onGlobalFilterChange}
      searchPlaceholder={t("dnsLogs.searchPlaceholder")}
      getStartedCard={
        <GetStartedTest
          icon={<Globe2 size={20} />}
          title={t("dnsLogs.emptyTitle")}
          description={t("dnsLogs.emptyDescription")}
        />
      }
      rightSide={(table) => (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            defaultValue={dnsDomainFilter}
            onChange={(event) => {
              setFilter("dns_domain", event.target.value || undefined);
            }}
            placeholder={t("dnsLogs.domainFilterPlaceholder")}
            className="h-10 w-[220px]"
          />
          <Select
            value={dnsTypeFilter || "all"}
            onValueChange={(value) => {
              setFilter("dns_type", value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger
              className="h-10 w-[132px] bg-nb-gray-930"
              aria-label={t("dnsLogs.typeFilter")}
            >
              <SelectValue placeholder={t("dnsLogs.typeFilter")} />
            </SelectTrigger>
            <SelectContent className="w-[132px]">
              <SelectItem value="all">{t("dnsLogs.allTypes")}</SelectItem>
              {DNS_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePickerWithRange value={dateRange} onChange={handleDateFilterChange} />
          <ButtonGroup>
            <DataTableRefreshButton
              isDisabled={isLoading}
              onClick={() => {
                mutate().then();
              }}
            />
            <DataTableRowsPerPage table={table} disabled={rows.length === 0} />
          </ButtonGroup>
        </div>
      )}
    />
  );
}
