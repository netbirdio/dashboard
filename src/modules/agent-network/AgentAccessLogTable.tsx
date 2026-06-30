"use client";

import Badge from "@components/Badge";
import { DatePickerWithRange } from "@components/DatePickerWithRange";
import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import {
  CheckboxListPicker,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  formatUsersChip,
  UserOption,
  UsersPicker,
} from "@components/table/filters/UsersPicker";
import {
  formatTextChip,
  TextInputPicker,
} from "@components/table/filters/TextInputPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import GetStartedTest from "@components/ui/GetStartedTest";
import MultipleGroups from "@components/ui/MultipleGroups";
import ButtonGroup from "@components/ButtonGroup";
import { cn, formatDuration } from "@utils/helpers";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRight,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeers } from "@/contexts/PeersProvider";
import { useServerPagination } from "@/contexts/ServerPaginationProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import {
  AIAccessLogEntry,
  AIAccessLogSession,
  AIProvider,
  AIProviderId,
  formatDenyReason,
} from "@/modules/agent-network/data/mockData";
import { formatDateChip } from "@/modules/agent-network/AccessLogFilters";
import {
  accessLogFromAgentAPI,
  accessLogSessionFromAgentAPI,
  APIAgentNetworkAccessLog,
  APIAgentNetworkAccessLogSession,
} from "@/modules/agent-network/agentAccessLogApi";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import AgentAccessLogExpandedRow from "@/modules/agent-network/AgentAccessLogExpandedRow";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { generateColorFromUser } from "@utils/helpers";

type Props = {
  headingTarget?: HTMLHeadingElement | null;
  // When true the table renders provider sessions (grouped) instead of flat
  // per-request rows. The owning page swaps the data endpoint to match.
  grouped?: boolean;
  onGroupedChange?: (value: boolean) => void;
};

// csvToArray splits a comma-separated filter value (the form the
// ServerPaginationProvider stores multi-select filters in) into a string array.
function csvToArray(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export default function AgentAccessLogTable({
  headingTarget,
  grouped = false,
  onGroupedChange,
}: Readonly<Props>) {
  const { providers } = useAIProviders();
  const { users } = useUsers();
  const { peers } = usePeers();
  const { groups } = useGroups();

  const {
    data: apiRows,
    isLoading,
    mutate,
    setFilter,
    getFilter,
    hasActiveFilters,
    ...paginationProps
  } = useServerPagination<unknown[]>();

  // Group-name resolution: the API ships authorising group ids; the dashboard
  // shows current catalog names. Renames track the catalog; deleted groups fall
  // back to their id.
  const groupNamesByID = useMemo(() => {
    const m = new Map<string, string>();
    (groups ?? []).forEach((g) => {
      if (g.id) m.set(g.id, g.name);
    });
    return m;
  }, [groups]);
  const groupIdByName = useMemo(() => {
    const m = new Map<string, string>();
    (groups ?? []).forEach((g) => {
      if (g.id && g.name) m.set(g.name, g.id);
    });
    return m;
  }, [groups]);

  // Flat per-request rows. Empty in grouped mode (the endpoint returns
  // sessions, not entries).
  const rows = useMemo<AIAccessLogEntry[]>(
    () =>
      grouped
        ? []
        : ((apiRows as APIAgentNetworkAccessLog[]) ?? []).map((e) =>
            accessLogFromAgentAPI(e, groupNamesByID),
          ),
    [apiRows, groupNamesByID, grouped],
  );

  // Session-grouped rows. Empty in flat mode.
  const sessionRows = useMemo<AIAccessLogSession[]>(
    () =>
      grouped
        ? ((apiRows as APIAgentNetworkAccessLogSession[]) ?? []).map((s) =>
            accessLogSessionFromAgentAPI(s, groupNamesByID),
          )
        : [],
    [apiRows, groupNamesByID, grouped],
  );

  // Searchable label per principal id (user name + email, or peer name +
  // hostname) so the free-text search matches the names shown in the User
  // column, not just the opaque user_id stored on the row.
  const principalSearchById = useMemo(() => {
    const m = new Map<string, string>();
    (users ?? []).forEach((u) =>
      m.set(u.id, [u.name, u.email].filter(Boolean).join(" ")),
    );
    (peers ?? []).forEach((p) => {
      if (p.id && !m.has(p.id)) {
        m.set(p.id, [p.name, p.hostname].filter(Boolean).join(" "));
      }
    });
    return m;
  }, [users, peers]);

  // Resolve the provider by the config-row id the router stamped on
  // the request (llm.resolved_provider_id). Agent-network requests
  // share one synth service per account, so the access log's
  // serviceId can't disambiguate between providers that claim the
  // same model — the router's resolved id is the only thing that
  // uniquely identifies which configured provider served the
  // request.
  const providerByConfigId = useMemo(() => {
    const map = new Map<string, AIProvider>();
    (providers ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const resolveProvider = (entry: AIAccessLogEntry) =>
    entry.resolvedProviderId
      ? providerByConfigId.get(entry.resolvedProviderId)
      : undefined;

  const columns = useMemo<ColumnDef<AIAccessLogEntry>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (row) => row.timestamp,
        header: ({ column }) => (
          <DataTableHeader column={column} name="timestamp">
            Time
          </DataTableHeader>
        ),
        cell: ({ row }) => <TimeCell timestamp={row.original.timestamp} />,
        filterFn: "dateRange",
        enableGlobalFilter: false,
      },
      {
        id: "user",
        accessorFn: (row) =>
          `${row.user} ${principalSearchById.get(row.userId) ?? ""}`.trim(),
        header: ({ column }) => (
          <DataTableHeader column={column} name="user">
            User / Agent
          </DataTableHeader>
        ),
        cell: ({ row }) => <UserCell entry={row.original} />,
      },
      {
        id: "group",
        accessorFn: (row) => (row.userGroups ?? []).join(" "),
        header: ({ column }) => (
          <DataTableHeader column={column} name="group">
            Auth Group
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <GroupCell groupNames={row.original.userGroups ?? []} />
        ),
      },
      {
        id: "provider",
        accessorFn: (row) => {
          const resolved = resolveProvider(row);
          // Include the resolved name, the raw vendor id, and the model so the
          // search matches whether the operator types "OpenAI API" or "openai".
          return `${resolved?.name ?? ""} ${row.providerId} ${
            row.model
          }`.trim();
        },
        header: ({ column }) => (
          <DataTableHeader column={column} name="provider" sorting={false}>
            Provider
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <ProviderCell
            entry={row.original}
            resolved={resolveProvider(row.original)}
          />
        ),
      },
      {
        id: "tokens",
        accessorFn: (row) => row.inputTokens + row.outputTokens,
        header: ({ column }) => (
          <DataTableHeader column={column} sorting={false}>
            Tokens
          </DataTableHeader>
        ),
        cell: ({ row }) => <TokensCell entry={row.original} />,
      },
      {
        id: "cost",
        accessorKey: "costUsd",
        header: ({ column }) => (
          <DataTableHeader column={column} name="cost">
            Cost
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <span
            className={
              "text-nb-gray-300 text-[0.82rem] px-3 py-2 font-mono whitespace-nowrap"
            }
          >
            ${row.original.costUsd.toFixed(4)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableHeader column={column} name="status">
            Status
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <div className={"flex items-center gap-3"}>
            <StatusCell entry={row.original} />
            <span
              className={
                "text-nb-gray-300 text-[0.82rem] px-3 py-2 font-mono"
              }
            >
              {formatDuration(row.original.durationMs)}
            </span>
          </div>
        ),
      },
      {
        id: "reason",
        accessorKey: "denyReason",
        header: ({ column }) => (
          <DataTableHeader column={column} name="reason">
            Reason
          </DataTableHeader>
        ),
        cell: ({ row }) => <ReasonCell entry={row.original} />,
      },
      // Hidden columns backing the Model and Path filters. Filtering is
      // server-side (manualFiltering), so these only need to exist for the
      // filter adapter/chips to read and write their value.
      {
        id: "model",
        accessorFn: (row) => row.model,
        enableGlobalFilter: false,
      },
      {
        id: "path",
        accessorFn: (row) => row.path,
        enableGlobalFilter: false,
      },
    ],
    [providerByConfigId, principalSearchById],
  );

  // Session-grouped columns. Filter ids (timestamp / user / group / provider /
  // model / path) are kept identical to the flat columns — some carried by
  // hidden columns — so the shared filter adapter and chips work unchanged.
  // Sortable headers map to the session-level aggregate sort fields the
  // /access-log-sessions endpoint understands.
  const sessionColumns = useMemo<ColumnDef<AIAccessLogSession>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (row) => row.endedAt,
        header: ({ column }) => (
          <DataTableHeader column={column} name="timestamp">
            Activity
          </DataTableHeader>
        ),
        cell: ({ row }) => <SessionActivityCell session={row.original} />,
        enableGlobalFilter: false,
      },
      {
        id: "user",
        accessorFn: (row) =>
          `${row.user} ${principalSearchById.get(row.userId) ?? ""}`.trim(),
        header: ({ column }) => (
          <DataTableHeader column={column} name="user_id">
            User / Agent
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <UserCell
            entry={
              {
                userId: row.original.userId,
                user: row.original.user,
              } as AIAccessLogEntry
            }
          />
        ),
      },
      {
        id: "group",
        accessorFn: (row) => (row.userGroups ?? []).join(" "),
        header: ({ column }) => (
          <DataTableHeader column={column} name="group" sorting={false}>
            Auth Group
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <GroupCell groupNames={row.original.userGroups ?? []} />
        ),
      },
      {
        id: "provider",
        accessorFn: (row) => row.models.join(" "),
        header: ({ column }) => (
          <DataTableHeader column={column} sorting={false}>
            Provider
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <SessionProviderCell
            session={row.original}
            resolveProvider={resolveProvider}
          />
        ),
      },
      {
        id: "requests",
        accessorFn: (row) => row.requestCount,
        header: ({ column }) => (
          <DataTableHeader column={column} name="request_count">
            Requests
          </DataTableHeader>
        ),
        cell: ({ row }) => <SessionRequestsCell session={row.original} />,
      },
      {
        id: "tokens",
        accessorFn: (row) => row.totalTokens,
        header: ({ column }) => (
          <DataTableHeader column={column} name="total_tokens">
            Tokens
          </DataTableHeader>
        ),
        // Reuse the flat per-request Tokens cell (input/output arrows) so the
        // session totals read the same as the Requests view.
        cell: ({ row }) => (
          <TokensCell
            entry={
              {
                inputTokens: row.original.inputTokens,
                outputTokens: row.original.outputTokens,
              } as AIAccessLogEntry
            }
          />
        ),
      },
      {
        id: "cost",
        accessorKey: "costUsd",
        header: ({ column }) => (
          <DataTableHeader column={column} name="cost_usd">
            Cost
          </DataTableHeader>
        ),
        cell: ({ row }) => (
          <span
            className={
              "text-nb-gray-300 text-[0.82rem] px-3 py-2 font-mono whitespace-nowrap"
            }
          >
            ${row.original.costUsd.toFixed(4)}
          </span>
        ),
      },
      {
        id: "reason",
        accessorKey: "decision",
        header: ({ column }) => (
          <DataTableHeader column={column} name="decision">
            Reason
          </DataTableHeader>
        ),
        // Same Reason cell as the flat view (deny reason, or the authorising
        // policy link). A session is one policy decision in practice; surface a
        // denied request when present, otherwise the first entry.
        cell: ({ row }) => {
          const entries = row.original.entries;
          const representative =
            entries.find((e) => e.decision === "deny") ?? entries[0];
          return representative ? (
            <ReasonCell entry={representative} />
          ) : (
            <EmptyRow />
          );
        },
      },
      // Hidden columns backing the Model / Path filters. Filtering is
      // server-side; these only need to exist for the filter adapter/chips.
      {
        id: "model",
        accessorFn: (row) => row.models.join(" "),
        enableGlobalFilter: false,
      },
      {
        id: "path",
        accessorFn: () => "",
        enableGlobalFilter: false,
      },
    ],
    [providerByConfigId, principalSearchById],
  );

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "timestamp",
      desc: true,
    },
  ]);

  // Filter option sources — stable catalogs, not the fetched page, so the
  // dropdowns list every choice even when the current page is narrow.
  const userOptions = useMemo<UserOption[]>(
    () =>
      (users ?? [])
        .filter((u) => u.email)
        .map((u) => ({
          id: u.id,
          name: u.name || u.email || "",
          email: u.email || "",
        })),
    [users],
  );
  const providerOptions = useMemo(
    () => (providers ?? []).map((p) => ({ value: p.id, label: p.name })),
    [providers],
  );
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    (providers ?? []).forEach((p) =>
      (p.models ?? []).forEach((m) => m.id && models.add(m.id)),
    );
    return Array.from(models)
      .sort()
      .map((m) => ({ value: m, label: m }));
  }, [providers]);

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        // Backed by the real "timestamp" column so the shared filter adapter can
        // read/write its value; maps to the start_date/end_date query params.
        id: "timestamp",
        label: "Date",
        renderPicker: (p) => (
          <div className={"p-1"}>
            <DatePickerWithRange
              value={p.value as DateRange | undefined}
              onChange={(range) => {
                p.onChange(range);
                setFilter(
                  "start_date",
                  range?.from
                    ? dayjs(range.from).startOf("day").toISOString()
                    : undefined,
                );
                setFilter(
                  "end_date",
                  range?.to
                    ? dayjs(range.to).endOf("day").toISOString()
                    : undefined,
                );
              }}
            />
          </div>
        ),
        formatChip: (v) => formatDateChip(v as DateRange | undefined),
      },
      {
        id: "user",
        label: "User",
        renderPicker: (p) => (
          <UsersPicker
            value={p.value as string | undefined}
            onChange={(next) => {
              p.onChange(next);
              // UsersPicker carries the email for display; the backend filters
              // by id, so resolve the picked email to its user id.
              const id = next
                ? userOptions.find((u) => u.email === next)?.id
                : undefined;
              setFilter("user_id", id || undefined);
            }}
            close={p.close}
            options={userOptions}
          />
        ),
        formatChip: (v) =>
          formatUsersChip(v as string | undefined, userOptions),
      },
      {
        id: "group",
        label: "Group",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={(next) => {
              p.onChange(next);
              const ids = (next ?? [])
                .map((name) => groupIdByName.get(name) ?? name)
                .join(",");
              setFilter("group_id", ids || undefined);
            }}
            close={p.close}
            groups={groups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
      {
        id: "provider",
        label: "Provider",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={(next) => {
              p.onChange(next);
              setFilter("provider_id", (next ?? []).join(",") || undefined);
            }}
            close={p.close}
            options={providerOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(
            v as string[] | undefined,
            providerOptions,
            "providers",
          ),
      },
      {
        id: "model",
        label: "Model",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={(next) => {
              p.onChange(next);
              setFilter("model", (next ?? []).join(",") || undefined);
            }}
            close={p.close}
            options={modelOptions}
          />
        ),
        formatChip: (v) =>
          formatCheckboxChip(v as string[] | undefined, modelOptions, "models"),
      },
      {
        id: "path",
        label: "Path",
        renderPicker: (p) => (
          <TextInputPicker
            value={p.value as string | undefined}
            onChange={(next) => {
              const trimmed = next?.trim() ?? "";
              p.onChange(trimmed ? trimmed : undefined);
              setFilter("path", trimmed ? trimmed : undefined);
            }}
            close={p.close}
            placeholder={"e.g. /v1/chat/completions"}
          />
        ),
        formatChip: (v) => formatTextChip(v as string | undefined),
      },
    ],
    [
      userOptions,
      providerOptions,
      modelOptions,
      groups,
      groupIdByName,
      setFilter,
    ],
  );

  // Seed the DataTable's column-filter chips from the active server query so a
  // shared/deep link or a remount shows the chips that match what's fetched.
  const initialColumnFilters = useMemo<{ id: string; value: unknown }[]>(() => {
    const filters: { id: string; value: unknown }[] = [];
    const startDate = getFilter("start_date");
    const endDate = getFilter("end_date");
    if (startDate || endDate) {
      filters.push({
        id: "timestamp",
        value: {
          from: startDate ? dayjs(startDate).toDate() : undefined,
          to: endDate ? dayjs(endDate).toDate() : undefined,
        },
      });
    }
    const userId = getFilter("user_id");
    if (userId) {
      // The picker is keyed by email; map the stored id back for display.
      const email = userOptions.find((u) => u.id === userId)?.email;
      if (email) filters.push({ id: "user", value: email });
    }
    const groupIds = csvToArray(getFilter("group_id"));
    if (groupIds.length) {
      filters.push({
        id: "group",
        value: groupIds.map((id) => groupNamesByID.get(id) ?? id),
      });
    }
    const providerIds = csvToArray(getFilter("provider_id"));
    if (providerIds.length)
      filters.push({ id: "provider", value: providerIds });
    const models = csvToArray(getFilter("model"));
    if (models.length) filters.push({ id: "model", value: models });
    const path = getFilter("path");
    if (path) filters.push({ id: "path", value: path });
    return filters;
  }, [getFilter, groupNamesByID, userOptions]);

  const hasRows = grouped ? sessionRows.length > 0 : rows.length > 0;

  return (
    <DataTable<AIAccessLogEntry | AIAccessLogSession, unknown>
      {...paginationProps}
      columns={
        (grouped ? sessionColumns : columns) as ColumnDef<
          AIAccessLogEntry | AIAccessLogSession,
          unknown
        >[]
      }
      data={grouped ? sessionRows : rows}
      isLoading={isLoading}
      headingTarget={headingTarget}
      inset={false}
      tableCellClassName={"py-1 px-2"}
      sorting={sorting}
      setSorting={setSorting}
      initialFilters={initialColumnFilters}
      columnVisibility={{ model: false, path: false }}
      aboveTable={(table) => (
        <TableFilterChips table={table} filters={filterDefs} />
      )}
      renderExpandedRow={(row) =>
        grouped ? (
          <SessionEntriesRow session={row as AIAccessLogSession} />
        ) : (
          <AgentAccessLogExpandedRow entry={row as AIAccessLogEntry} />
        )
      }
      searchPlaceholder={"Search by user, agent, model, prompt…"}
      text={grouped ? "Sessions" : "Requests"}
      uniqueKey={
        grouped
          ? "agent-network-access-log-sessions"
          : "agent-network-access-log"
      }
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
          title={"No Access Log Entries Yet"}
          description={
            "No agent-network requests detected yet. This may be because no AI providers are connected, policies don’t allow traffic to them, log collection is disabled, or no traffic has occurred."
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
    >
      {(table) => (
        <>
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={!hasRows && !hasActiveFilters}
          />
          <ButtonGroup disabled={isLoading}>
            <ButtonGroup.Button
              className={"h-[42px]"}
              variant={grouped ? "secondary" : "tertiary"}
              onClick={() => onGroupedChange?.(false)}
            >
              Requests
            </ButtonGroup.Button>
            <ButtonGroup.Button
              // Drop the left border so it doesn't stack with the first
              // button's right border into a doubled divider.
              className={"h-[42px] !border-l-0"}
              variant={grouped ? "tertiary" : "secondary"}
              onClick={() => onGroupedChange?.(true)}
            >
              Sessions
            </ButtonGroup.Button>
          </ButtonGroup>
          <DataTableRefreshButton
            isDisabled={!hasRows && !hasActiveFilters}
            onClick={() => mutate()}
          />
        </>
      )}
    </DataTable>
  );
}

function TimeCell({ timestamp }: { timestamp: string }) {
  return (
    <div className={"w-full flex flex-col gap-1 min-w-[120px] max-w-[120px]"}>
      <div
        className={cn(
          "flex-col flex whitespace-nowrap",
          "dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 py-2 px-3 rounded-md cursor-default",
        )}
      >
        <span className={"text-nb-gray-200 flex gap-2 items-center"}>
          {dayjs(timestamp).format("MMM D, YYYY")}
        </span>
        <span className={"text-nb-gray-400"}>
          {dayjs(timestamp).format("h:mm:ss A")}
        </span>
      </div>
    </div>
  );
}

// ReasonCell shows the deny reason for blocked requests, and for allowed
// requests a clickable reference to the policy that authorised it — linking
// to the Policies view pre-filtered to that policy.
function ReasonCell({ entry }: { entry: AIAccessLogEntry }) {
  const { policies } = useAIProviders();

  if (entry.decision === "deny") {
    return (
      <span className={"text-nb-gray-300 text-[0.82rem] px-3 py-2 text-left"}>
        {formatDenyReason(entry.denyReason) || "-"}
      </span>
    );
  }

  const policy = entry.selectedPolicyId
    ? policies?.find((p) => p.id === entry.selectedPolicyId)
    : undefined;

  if (!policy) {
    return (
      <span className={"text-nb-gray-300 text-[0.82rem] px-3 py-2 text-left"}>
        -
      </span>
    );
  }

  return (
    <div className={"px-3 py-2"}>
      <FullTooltip content={"This policy allowed the request"}>
        <Link
          href={`/agent-network/policies?search=${encodeURIComponent(
            policy.name,
          )}`}
          onClick={(e) => e.stopPropagation()}
          className={
            "group/policy inline-flex items-center gap-1.5 text-[0.82rem] text-nb-gray-300 hover:text-nb-gray-100 transition-colors whitespace-nowrap"
          }
        >
          <ShieldCheckIcon
            size={13}
            className={
              "shrink-0 text-nb-gray-500 group-hover/policy:text-nb-gray-300"
            }
          />
          <span className={"group-hover/policy:underline"}>{policy.name}</span>
        </Link>
      </FullTooltip>
    </div>
  );
}

function StatusCell({ entry }: { entry: AIAccessLogEntry }) {
  const isSuccess = entry.status >= 200 && entry.status < 400;
  return (
    <Badge variant={isSuccess ? "green" : "red"} className={"w-[50px]"}>
      {entry.status}
    </Badge>
  );
}

function GroupCell({ groupNames }: { groupNames: string[] }) {
  const { groups: realGroups } = useGroups();
  if (groupNames.length === 0) return <EmptyRow />;
  // Match real groups by name when available; otherwise synthesise a
  // badge-shaped placeholder so the styling stays identical to the
  // policies table's Source column.
  const groups: Group[] = groupNames.map((name) => {
    const real = realGroups?.find((g) => g.name === name);
    return real ?? { id: name, name, peers_count: 0 };
  });
  return (
    <div className={"px-2 py-1.5"}>
      <MultipleGroups
        groups={groups}
        label={"User Groups"}
        description={"Groups the user belonged to at the time of the request."}
        countOnly
      />
    </div>
  );
}

function UserCell({ entry }: { entry: AIAccessLogEntry }) {
  // The access log's userId field is whatever the proxy stamped as
  // the principal — for tunnel-peer auth that's peer.ID; for OIDC /
  // header / interactive flows that's user.ID. Look up users first,
  // then peers, so both human users and unattached agent peers render
  // with their real display name. Fall back to entry.user (the
  // display identity the proxy already resolved — user.email or
  // peer.name) and finally to the raw id.
  const { users } = useUsers();
  const { peers } = usePeers();

  const user = useMemo(() => {
    if (!entry.userId) return undefined;
    return users?.find((u) => u.id === entry.userId);
  }, [users, entry.userId]);

  const peer = useMemo(() => {
    if (!entry.userId || user) return undefined;
    return peers?.find((p) => p.id === entry.userId);
  }, [peers, entry.userId, user]);

  if (!entry.userId && !entry.user) {
    return <EmptyRow />;
  }

  // Resolve a display name + secondary line. Users get name+email;
  // peers get peer.name with an "agent" subline so operators can tell
  // them apart from human users at a glance.
  let displayName: string;
  let displaySub: string | null;
  let identityForColor: { id: string; name: string; email: string };
  if (user) {
    displayName = user.name || user.email || entry.userId;
    displaySub = user.email || null;
    identityForColor = {
      id: user.id,
      name: displayName,
      email: user.email ?? "",
    };
  } else if (peer) {
    displayName = peer.name || entry.user || entry.userId;
    displaySub = "Agent";
    identityForColor = {
      id: peer.id ?? entry.userId,
      name: displayName,
      email: "",
    };
  } else {
    displayName = entry.user || entry.userId;
    displaySub = null;
    identityForColor = {
      id: entry.userId,
      name: displayName,
      email: "",
    };
  }

  return (
    <div className={"flex items-center gap-2 py-2 px-3"}>
      <div
        className={
          "w-8 h-8 rounded-full flex items-center justify-center text-white uppercase text-xs font-medium bg-nb-gray-900 shrink-0"
        }
        style={{
          color: generateColorFromUser(identityForColor),
        }}
      >
        {displayName?.charAt(0) || "?"}
      </div>

      <div className="flex flex-col gap-0 min-w-0">
        <span className={"text-sm text-nb-gray-200 truncate"}>
          <TextWithTooltip text={displayName} maxChars={20} />
        </span>
        {displaySub && (
          <span className={"text-xs text-nb-gray-400 font-light truncate"}>
            <TextWithTooltip text={displaySub} maxChars={25} />
          </span>
        )}
      </div>
    </div>
  );
}

function ProviderCell({
  entry,
  resolved,
}: {
  entry: AIAccessLogEntry;
  resolved?: AIProvider;
}) {
  // Logo uses the catalog id of the resolved provider when available,
  // falling back to the parser-level vendor (entry.providerId) for
  // legacy entries the router didn't stamp.
  const logoId = resolved?.providerId ?? entry.providerId;
  const displayName = resolved?.name ?? entry.providerId;
  return (
    <div className={"flex items-center gap-2 py-2 px-3 whitespace-nowrap"}>
      <AIProviderLogo providerId={logoId} size={20} />
      <div className={"flex flex-col min-w-0"}>
        <span className={"text-sm text-nb-gray-200 truncate"}>
          {displayName}
        </span>
        <code className={"text-[11px] text-nb-gray-400 font-mono truncate"}>
          {entry.model}
        </code>
      </div>
    </div>
  );
}

function TokensCell({ entry }: { entry: AIAccessLogEntry }) {
  if (
    (entry.inputTokens === undefined || entry.inputTokens === 0) &&
    (entry.outputTokens === undefined || entry.outputTokens === 0)
  ) {
    return <EmptyRow />;
  }
  const total = (entry.inputTokens ?? 0) + (entry.outputTokens ?? 0);
  return (
    <FullTooltip
      content={
        <div className={"text-xs flex flex-col gap-1"}>
          <div className={"flex items-center gap-2 whitespace-nowrap"}>
            <ArrowUpIcon size={12} className={"text-sky-400 shrink-0"} />
            <span className={"font-medium"}>
              {entry.inputTokens.toLocaleString()}
            </span>
            <span className={"text-nb-gray-400"}>input</span>
          </div>
          <div className={"flex items-center gap-2 whitespace-nowrap"}>
            <ArrowDownIcon size={12} className={"text-netbird shrink-0"} />
            <span className={"font-medium"}>
              {entry.outputTokens.toLocaleString()}
            </span>
            <span className={"text-nb-gray-400"}>output</span>
          </div>
          <div
            className={
              "border-t border-nb-gray-800 mt-0.5 pt-1 flex items-center gap-2 text-nb-gray-400 whitespace-nowrap"
            }
          >
            <span className={"w-3 shrink-0"} aria-hidden={true} />
            <span className={"font-medium text-nb-gray-200"}>
              {total.toLocaleString()}
            </span>
            <span>total</span>
          </div>
        </div>
      }
    >
      <div
        className={"flex flex-col text-xs gap-1 text-nb-gray-300 font-medium"}
      >
        <div className={"flex gap-2 items-center whitespace-nowrap"}>
          <ArrowUpIcon size={15} className={"text-sky-400"} />
          <span className={"sr-only"}>Input:</span>
          {entry.inputTokens.toLocaleString()}
        </div>
        <div className={"flex gap-2 items-center whitespace-nowrap"}>
          <ArrowDownIcon size={15} className={"text-netbird"} />
          <span className={"sr-only"}>Output:</span>
          {entry.outputTokens.toLocaleString()}
        </div>
      </div>
    </FullTooltip>
  );
}

// resolveProviderFn resolves a request's configured provider (by the router's
// stamped resolved_provider_id) — shared by the session cells so they reuse the
// flat row's provider resolution.
type ResolveProviderFn = (entry: AIAccessLogEntry) => AIProvider | undefined;

// SessionActivityCell shows the session's last-activity date and its first→last
// time-of-day span. The elapsed duration moves to the Requests column.
function SessionActivityCell({ session }: { session: AIAccessLogSession }) {
  const start = dayjs(session.startedAt);
  const end = dayjs(session.endedAt);
  return (
    <div
      className={
        "w-full flex flex-col gap-1 min-w-[150px] max-w-[170px] py-2 px-3"
      }
    >
      <span className={"text-nb-gray-200"}>{end.format("MMM D, YYYY")}</span>
      <span className={"text-nb-gray-400 text-xs whitespace-nowrap"}>
        {start.format("h:mm A")} → {end.format("h:mm A")}
      </span>
    </div>
  );
}

// SessionProviderCell lists the distinct providers/models seen across the
// session's entries, resolved the same way as the flat Provider column.
function SessionProviderCell({
  session,
  resolveProvider,
}: {
  session: AIAccessLogSession;
  resolveProvider: ResolveProviderFn;
}) {
  const items = useMemo(() => {
    const seen = new Map<string, { logoId: AIProviderId; name: string }>();
    session.entries.forEach((e) => {
      const resolved = resolveProvider(e);
      const logoId = resolved?.providerId ?? e.providerId;
      const name = resolved?.name ?? e.providerId;
      if (!seen.has(logoId)) seen.set(logoId, { logoId, name });
    });
    return Array.from(seen.values());
  }, [session.entries, resolveProvider]);

  if (items.length === 0) return <EmptyRow />;
  const [primary] = items;
  const extra = items.length - 1;
  return (
    <div className={"flex items-center gap-2 py-2 px-3 whitespace-nowrap"}>
      <AIProviderLogo providerId={primary.logoId} size={20} />
      <div className={"flex flex-col min-w-0"}>
        <span className={"text-sm text-nb-gray-200 truncate"}>
          {primary.name}
          {extra > 0 ? ` +${extra}` : ""}
        </span>
        {session.models.length > 1 ? (
          <FullTooltip
            content={
              <div className={"text-xs flex flex-col gap-0.5"}>
                {session.models.map((m) => (
                  <span key={m} className={"font-mono whitespace-nowrap"}>
                    {m}
                  </span>
                ))}
              </div>
            }
          >
            <code
              className={
                "text-[11px] text-nb-gray-400 font-mono truncate cursor-default underline decoration-dashed decoration-nb-gray-600 underline-offset-2"
              }
            >
              {session.models.length} models
            </code>
          </FullTooltip>
        ) : (
          <code className={"text-[11px] text-nb-gray-400 font-mono truncate"}>
            {session.models[0] ?? "—"}
          </code>
        )}
      </div>
    </div>
  );
}

// formatSessionSpan renders an elapsed session duration in compact, readable
// units ("8s", "5m 12s", "1h 26m", "2d 3h") — unlike formatDuration, which is
// tuned for sub-second/per-request timings and would show e.g. "1.4h".
function formatSessionSpan(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    const seconds = totalSeconds % 60;
    return seconds ? `${totalMinutes}m ${seconds}s` : `${totalMinutes}m`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

// SessionRequestsCell shows the request count and how long the session ran
// (e.g. "15 · over 1h 26m").
function SessionRequestsCell({ session }: { session: AIAccessLogSession }) {
  const span = formatSessionSpan(
    dayjs(session.endedAt).diff(dayjs(session.startedAt)),
  );
  return (
    <div className={"flex flex-col gap-0.5 px-3 py-2 whitespace-nowrap"}>
      <span className={"text-nb-gray-200 text-sm tabular-nums"}>
        {session.requestCount.toLocaleString()}
      </span>
      {span && (
        <span className={"text-nb-gray-500 text-[11px]"}>over {span}</span>
      )}
    </div>
  );
}

// SessionEntriesRow is the session's expanded content: the session's requests as
// a compact list, each itself expandable to the full per-request detail
// (AgentAccessLogExpandedRow) — the second level of disclosure. The provider is
// omitted (constant across a session); the model is shown in full, and the
// status carries the request duration plus a reason when it failed.
function SessionEntriesRow({ session }: { session: AIAccessLogSession }) {
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (id: string) =>
    setOpen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className={"px-4 py-3 bg-nb-gray-940/30"}>
      <div
        className={
          "text-[11px] font-medium uppercase tracking-wide text-nb-gray-400 mb-1.5"
        }
      >
        {session.requestCount} request{session.requestCount === 1 ? "" : "s"} in
        this session
      </div>
      <div
        className={
          "rounded-md border border-nb-gray-800 divide-y divide-nb-gray-800/70 overflow-hidden"
        }
      >
        {[...session.entries].reverse().map((entry) => {
          const isOpen = open.includes(entry.id);
          const total = (entry.inputTokens ?? 0) + (entry.outputTokens ?? 0);
          const isError = entry.decision === "deny" || entry.status >= 400;
          return (
            <div key={entry.id}>
              <button
                type={"button"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(entry.id);
                }}
                className={
                  "w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-nb-gray-900/40 transition-colors"
                }
              >
                <ChevronRight
                  size={14}
                  className={cn(
                    "text-nb-gray-500 shrink-0 transition-transform",
                    isOpen && "rotate-90",
                  )}
                />
                <span
                  className={
                    "text-xs text-nb-gray-400 font-mono whitespace-nowrap w-[88px] shrink-0"
                  }
                >
                  {dayjs(entry.timestamp).format("h:mm:ss A")}
                </span>
                <span
                  className={
                    "text-xs text-nb-gray-300 font-mono truncate min-w-0 max-w-[420px]"
                  }
                >
                  {[entry.method, entry.path].filter(Boolean).join(" ") || "—"}
                </span>
                <div
                  className={
                    "flex items-center gap-2 whitespace-nowrap shrink-0"
                  }
                >
                  <span
                    className={cn(
                      "text-xs font-mono tabular-nums",
                      isError ? "text-red-400" : "text-nb-gray-400",
                    )}
                  >
                    {entry.status}
                  </span>
                  <span
                    className={
                      "text-xs text-nb-gray-400 font-mono tabular-nums w-[56px]"
                    }
                  >
                    {formatDuration(entry.durationMs)}
                  </span>
                </div>
                {isError && (
                  <span
                    className={
                      "text-[11px] text-red-300 truncate max-w-[180px] shrink-0"
                    }
                  >
                    {formatDenyReason(entry.denyReason) || "Failed"}
                  </span>
                )}
                <div className={"flex-1"} />
                <code
                  className={
                    "text-[11px] text-nb-gray-300 font-mono whitespace-nowrap"
                  }
                >
                  {entry.model || "—"}
                </code>
                <span
                  className={
                    "text-xs text-nb-gray-400 font-mono whitespace-nowrap tabular-nums w-[110px] text-right shrink-0"
                  }
                >
                  {total.toLocaleString()} tokens
                </span>
                <span
                  className={
                    "text-xs text-nb-gray-400 font-mono whitespace-nowrap tabular-nums w-[64px] text-right shrink-0"
                  }
                >
                  ${entry.costUsd.toFixed(4)}
                </span>
              </button>
              {isOpen && (
                <div className={"border-t border-nb-gray-800/70"}>
                  <AgentAccessLogExpandedRow entry={entry} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
