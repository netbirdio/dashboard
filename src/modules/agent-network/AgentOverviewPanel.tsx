"use client";

import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import useFetchApi from "@utils/api";
import { isAgentNetworkEnabled } from "@utils/netbird";
import dayjs from "dayjs";
import { ActivityIcon, ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { useAccessLogFilters } from "@/modules/agent-network/AccessLogFilters";
import {
  APIAgentNetworkUsageBucket,
  buildUsageOverviewQuery,
} from "@/modules/agent-network/agentAccessLogApi";

// Register the chart.js building blocks we use. Idempotent, so it's safe
// even when another agent-network chart already registered them.
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Metric = "tokens" | "cost";

type DayBucket = {
  key: string;
  input: number;
  output: number;
  cost: number;
};

// AgentOverviewPanel shows account consumption over time as a per-day bar
// chart with a Tokens / Cost switch, and a standard data table of the same
// per-day buckets underneath. Data comes pre-aggregated from the server's
// /agent-network/usage/overview endpoint (day granularity); the shared filter
// bar (Date / User / Group / Provider / Model) drives the query.
export default function AgentOverviewPanel() {
  const [metric, setMetric] = useState<Metric>("tokens");
  const { columnFilters, filtersButton, filterChips, resetButton } =
    useAccessLogFilters();
  const { groups } = useGroups();
  const { users } = useUsers();

  // name → id and email → id maps so the (display-oriented) filter values
  // translate to the ids the backend filters on.
  const groupIdByName = useMemo(() => {
    const m = new Map<string, string>();
    (groups ?? []).forEach((g) => {
      if (g.id && g.name) m.set(g.name, g.id);
    });
    return m;
  }, [groups]);
  const userIdByEmail = useMemo(() => {
    const m = new Map<string, string>();
    (users ?? []).forEach((u) => {
      if (u.id && u.email) m.set(u.email, u.id);
    });
    return m;
  }, [users]);

  const query = useMemo(
    () => buildUsageOverviewQuery(columnFilters, groupIdByName, userIdByEmail),
    [columnFilters, groupIdByName, userIdByEmail],
  );

  const { data: buckets } = useFetchApi<APIAgentNetworkUsageBucket[]>(
    `/agent-network/usage/overview?${query}`,
    false,
    true,
    isAgentNetworkEnabled(),
  );

  const daily = useMemo(() => toDailyBuckets(buckets ?? []), [buckets]);

  return (
    <div className={"flex flex-col"}>
      <div className={"p-default pt-2 flex items-center gap-2"}>
        {filtersButton}
        {resetButton}
      </div>
      {filterChips}
      <OverviewContent daily={daily} metric={metric} setMetric={setMetric} />
    </div>
  );
}

function OverviewContent({
  daily,
  metric,
  setMetric,
}: {
  daily: DayBucket[];
  metric: Metric;
  setMetric: (m: Metric) => void;
}) {
  return (
    <div className={"flex flex-col"}>
      <div className={"p-default py-6"}>
        <div
          className={
            "rounded-lg border border-nb-gray-900 bg-nb-gray-940/40 p-5 flex flex-col gap-5"
          }
        >
          <div className={"flex items-start justify-between gap-3"}>
            <div>
              <h3 className={"text-sm font-medium text-nb-gray-100"}>
                {metric === "tokens" ? "Token usage" : "Cost"} by day
              </h3>
              <p className={"text-xs text-nb-gray-400 leading-snug mt-0.5"}>
                {metric === "tokens"
                  ? "Input and output tokens per day."
                  : "Estimated spend per day."}
              </p>
            </div>
            <ButtonGroup>
              <ButtonGroup.Button
                variant={metric === "tokens" ? "tertiary" : "secondary"}
                onClick={() => setMetric("tokens")}
                className={"!h-[30px] !px-3 !py-0 text-xs"}
              >
                Tokens
              </ButtonGroup.Button>
              <ButtonGroup.Button
                variant={metric === "cost" ? "tertiary" : "secondary"}
                onClick={() => setMetric("cost")}
                className={"!h-[30px] !px-3 !py-0 text-xs"}
              >
                Cost
              </ButtonGroup.Button>
            </ButtonGroup>
          </div>

          <div className={"h-72"}>
            {daily.length === 0 ? (
              <ChartEmptyState />
            ) : (
              <ConsumptionByDayChart daily={daily} metric={metric} />
            )}
          </div>
        </div>
      </div>

      <DailyBreakdownTable daily={daily} />
    </div>
  );
}

// DailyBreakdownTable renders the per-day buckets as a standard DataTable —
// same look as every other table in the app. Only days with activity are
// listed (zero-filler days exist for the chart's continuous axis).
function DailyBreakdownTable({ daily }: { daily: DayBucket[] }) {
  const rows = useMemo(
    () => daily.filter((d) => d.input + d.output > 0 || d.cost > 0),
    [daily],
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const columns = useMemo<ColumnDef<DayBucket>[]>(
    () => [
      {
        id: "date",
        accessorKey: "key",
        header: ({ column }) => (
          <DataTableHeader column={column}>Date</DataTableHeader>
        ),
        cell: ({ row }) => (
          <span className={"text-nb-gray-200 px-3 py-2 whitespace-nowrap"}>
            {dayjs(row.original.key).format("MMM D, YYYY")}
          </span>
        ),
      },
      {
        id: "input",
        accessorKey: "input",
        header: ({ column }) => (
          <DataTableHeader column={column}>Input Tokens</DataTableHeader>
        ),
        cell: ({ row }) => <NumberCell value={row.original.input} />,
      },
      {
        id: "output",
        accessorKey: "output",
        header: ({ column }) => (
          <DataTableHeader column={column}>Output Tokens</DataTableHeader>
        ),
        cell: ({ row }) => <NumberCell value={row.original.output} />,
      },
      {
        id: "total",
        accessorFn: (row) => row.input + row.output,
        header: ({ column }) => (
          <DataTableHeader column={column}>Total Tokens</DataTableHeader>
        ),
        cell: ({ row }) => (
          <NumberCell value={row.original.input + row.original.output} />
        ),
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: ({ column }) => (
          <DataTableHeader column={column}>Cost</DataTableHeader>
        ),
        cell: ({ row }) => (
          <span
            className={"text-nb-gray-300 px-3 py-2 font-mono whitespace-nowrap"}
          >
            ${row.original.cost.toFixed(2)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      text={"Days"}
      columns={columns}
      data={rows}
      sorting={sorting}
      setSorting={setSorting}
      showSearchAndFilters={false}
      initialPageSize={25}
      uniqueKey={"agent-network-overview-daily"}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={
                <AgentNetworkIcon className={"fill-nb-gray-200"} size={20} />
              }
              color={"gray"}
              size={"large"}
            />
          }
          title={"No usage recorded yet"}
          description={
            "Daily token and cost totals appear here as agents send requests through the providers you've connected."
          }
          learnMore={
            <>
              Learn more about
              <InlineLink href={"https://docs.netbird.io/"} target={"_blank"}>
                Agent Network
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
    />
  );
}

function NumberCell({ value }: { value: number }) {
  return (
    <span className={"text-nb-gray-300 px-3 py-2 font-mono whitespace-nowrap"}>
      {value.toLocaleString()}
    </span>
  );
}

function ConsumptionByDayChart({
  daily,
  metric,
}: {
  daily: DayBucket[];
  metric: Metric;
}) {
  const labels = daily.map((d) => dayjs(d.key).format("MMM D"));

  const data =
    metric === "tokens"
      ? {
          labels,
          datasets: [
            {
              label: "Input tokens",
              data: daily.map((d) => d.input),
              backgroundColor: "rgba(99, 102, 241, 0.6)", // indigo-500
              stack: "tokens",
            },
            {
              label: "Output tokens",
              data: daily.map((d) => d.output),
              backgroundColor: "rgba(34, 197, 94, 0.6)", // green-500
              stack: "tokens",
            },
          ],
        }
      : {
          labels,
          datasets: [
            {
              label: "Cost (USD)",
              data: daily.map((d) => d.cost),
              backgroundColor: "rgba(246, 131, 48, 0.65)", // netbird orange
            },
          ],
        };

  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4, right: 8 } },
        plugins: {
          legend: {
            display: metric === "tokens",
            position: "bottom",
            labels: { color: "#9ca3af" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                metric === "cost"
                  ? `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(2)}`
                  : `${ctx.dataset.label}: ${Number(
                      ctx.parsed.y,
                    ).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            stacked: metric === "tokens",
            ticks: { color: "#9ca3af", maxRotation: 0, autoSkip: true },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
          y: {
            stacked: metric === "tokens",
            beginAtZero: true,
            ticks: {
              color: "#9ca3af",
              callback: (value) =>
                metric === "cost"
                  ? `$${Number(value).toFixed(2)}`
                  : Number(value).toLocaleString(),
            },
            grid: { color: "rgba(255,255,255,0.04)" },
          },
        },
      }}
    />
  );
}

function ChartEmptyState() {
  return (
    <div
      className={
        "h-full flex flex-col items-center justify-center text-nb-gray-500 text-xs gap-2"
      }
    >
      <ActivityIcon size={20} />
      <span>No usage in the selected range</span>
    </div>
  );
}

// toDailyBuckets maps the server's daily usage buckets to DayBucket and fills
// the gaps between the first and last day so the chart reads as a continuous
// daily timeline instead of collapsing sparse days together. (Day granularity;
// the endpoint also supports week/month, which the UI doesn't request yet.)
function toDailyBuckets(buckets: APIAgentNetworkUsageBucket[]): DayBucket[] {
  if (!buckets || buckets.length === 0) return [];

  const map = new Map<string, DayBucket>();
  for (const b of buckets) {
    map.set(b.period_start, {
      key: b.period_start,
      input: b.input_tokens ?? 0,
      output: b.output_tokens ?? 0,
      cost: b.cost_usd ?? 0,
    });
  }

  const keys = [...map.keys()].sort();
  const start = dayjs(keys[0]);
  const end = dayjs(keys[keys.length - 1]);

  const out: DayBucket[] = [];
  let cur = start;
  // Cap at a year of days as a defensive bound against a bad range.
  for (let i = 0; i < 366 && !cur.isAfter(end); i++) {
    const key = cur.format("YYYY-MM-DD");
    out.push(map.get(key) ?? { key, input: 0, output: 0, cost: 0 });
    cur = cur.add(1, "day");
  }
  return out;
}
