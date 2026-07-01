"use client";

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
import GetStartedTest from "@components/ui/GetStartedTest";
import MultipleGroups from "@components/ui/MultipleGroups";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import {
  CircleUser,
  ExternalLinkIcon,
  Gauge,
  Globe2,
  MoreVertical,
  PencilLineIcon,
  PlusCircle,
  Power,
  SlidersHorizontal,
  Trash2,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import AgentBudgetRuleModal from "@/modules/agent-network/AgentBudgetRuleModal";
import {
  AgentBudgetRule,
  PolicyBudgetLimit,
  PolicyTokenLimit,
} from "@/modules/agent-network/data/mockData";

function NameCell({ rule }: { rule: AgentBudgetRule }) {
  return (
    <ActiveInactiveRow
      active={rule.enabled}
      inactiveDot={"gray"}
      text={rule.name}
      data-testid={rule.name}
    />
  );
}

function EnabledCell({ rule }: { rule: AgentBudgetRule }) {
  const { toggleBudgetRule } = useAIProviders();
  return (
    <div className={"flex min-w-[0px]"}>
      <ToggleSwitch
        checked={rule.enabled}
        size={"small"}
        onClick={(e) => {
          e.stopPropagation();
          toggleBudgetRule(rule.id);
        }}
      />
    </div>
  );
}

function TargetGroupsCell({ rule }: { rule: AgentBudgetRule }) {
  const { groups: realGroups } = useGroups();
  if (rule.targetGroups.length === 0 && rule.targetUsers.length === 0) {
    return (
      <Badge variant={"blue"} className={"whitespace-nowrap"}>
        <Globe2 size={12} />
        Account-wide
      </Badge>
    );
  }
  if (rule.targetGroups.length === 0) return <EmptyRow />;
  const groups: Group[] = rule.targetGroups.map((id) => {
    const real = realGroups?.find((g) => g.id === id);
    if (real) return real;
    return { id, name: id, peers_count: 0 } as Group;
  });
  return (
    <MultipleGroups
      groups={groups}
      label={"Target Groups"}
      description={"This limit applies to members of these groups."}
    />
  );
}

function TargetUsersCell({ rule }: { rule: AgentBudgetRule }) {
  const { users: allUsers } = useUsers();
  if (rule.targetUsers.length === 0) return <EmptyRow />;
  const resolved = rule.targetUsers.map((id) => {
    const u = allUsers?.find((au) => au.id === id);
    return {
      id,
      label: u?.name || u?.email || id,
      sub: u?.email && u?.name ? u.email : undefined,
    };
  });
  const first = resolved[0];
  const rest = resolved.slice(1);
  return (
    <div className={"flex"}>
      <FullTooltip
        content={
          <div className={"flex flex-col gap-1 text-xs"}>
            {resolved.map((r) => (
              <div key={r.id}>
                {r.label}
                {r.sub ? (
                  <span className={"text-nb-gray-400"}> · {r.sub}</span>
                ) : null}
              </div>
            ))}
          </div>
        }
      >
        <div className={"inline-flex items-center gap-2 z-0"}>
          <Badge
            variant={"gray-ghost"}
            useHover={true}
            className={"whitespace-nowrap"}
          >
            <CircleUser size={12} />
            {first.label}
          </Badge>
          {rest.length > 0 && (
            <Badge
              variant={"gray-ghost"}
              useHover={true}
              className={"px-3 gap-2 whitespace-nowrap"}
            >
              + {rest.length}
            </Badge>
          )}
        </div>
      </FullTooltip>
    </div>
  );
}

function TokenCapCell({ rule }: { rule: AgentBudgetRule }) {
  const tl = rule.limits.tokenLimit;
  if (!tl.enabled) return <EmptyRow />;
  return (
    <FullTooltip
      content={
        <div className={"text-xs space-y-0.5"}>
          <div className={"font-semibold"}>Token Limit</div>
          <div>· Group: {capDisplay(tl.groupCap, false)}</div>
          <div>· Individual: {capDisplay(tl.userCap, false)}</div>
          <div>· Resets every {formatLimitWindow(tl.windowSeconds)}</div>
        </div>
      }
    >
      <Badge variant={"gray"} useHover={true}>
        <Gauge size={14} className={"text-indigo-400"} />
        {formatTokenLimit(tl)}
      </Badge>
    </FullTooltip>
  );
}

function BudgetCapCell({ rule }: { rule: AgentBudgetRule }) {
  const bl = rule.limits.budgetLimit;
  if (!bl.enabled) return <EmptyRow />;
  return (
    <FullTooltip
      content={
        <div className={"text-xs space-y-0.5"}>
          <div className={"font-semibold"}>Budget Limit</div>
          <div>· Group: {capDisplay(bl.groupCapUsd, true)}</div>
          <div>· Individual: {capDisplay(bl.userCapUsd, true)}</div>
          <div>· Resets every {formatLimitWindow(bl.windowSeconds)}</div>
        </div>
      }
    >
      <Badge variant={"gray"} useHover={true}>
        <Wallet size={14} className={"text-amber-400"} />
        {formatBudgetLimit(bl)}
      </Badge>
    </FullTooltip>
  );
}

function UpdatedCell({ rule }: { rule: AgentBudgetRule }) {
  if (!rule.updatedAt) return <EmptyRow />;
  return (
    <div className={"text-xs text-nb-gray-300"}>
      {dayjs(rule.updatedAt).format("MMM D, YYYY")}
    </div>
  );
}

function formatTokenLimit(l: PolicyTokenLimit): string {
  return `${capDisplay(l.groupCap, false)} · ${capDisplay(l.userCap, false)}`;
}

function formatBudgetLimit(l: PolicyBudgetLimit): string {
  return `${capDisplay(l.groupCapUsd, true)} · ${capDisplay(l.userCapUsd, true)}`;
}

function capDisplay(value: number, isUsd: boolean): string {
  if (!value) return "—";
  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return isUsd ? `$${compact}` : compact;
}

function formatLimitWindow(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (seconds < 86_400) {
    const hours = Math.round(seconds / 3600);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.floor(seconds / 86_400);
  const remHours = Math.round((seconds % 86_400) / 3600);
  if (remHours === 0) return `${days} day${days === 1 ? "" : "s"}`;
  return `${days}d ${remHours}h`;
}

function ActionsCell({
  rule,
  onEdit,
}: {
  rule: AgentBudgetRule;
  onEdit: (r: AgentBudgetRule) => void;
}) {
  const { confirm } = useDialog();
  const { toggleBudgetRule, deleteBudgetRule } = useAIProviders();

  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete '${rule.name}'?`,
      description:
        "Are you sure you want to delete this global limit? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!ok) return;
    deleteBudgetRule(rule.id);
  };

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
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={"w-auto"} align={"end"}>
          <DropdownMenuItem onClick={() => onEdit(rule)}>
            <div className={"flex gap-3 items-center"}>
              <PencilLineIcon size={14} className={"shrink-0"} />
              Edit Rule
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleBudgetRule(rule.id)}>
            <div className={"flex gap-3 items-center"}>
              <Power size={14} className={"shrink-0"} />
              {rule.enabled ? "Disable" : "Enable"}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} variant={"danger"}>
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function AgentBudgetRulesTable() {
  const path = usePathname();
  const { budgetRules, budgetRulesLoading } = useAIProviders();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path + "-budget-rules",
    [{ id: "name", desc: false }],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<AgentBudgetRule | undefined>(
    undefined,
  );

  const openEdit = (r: AgentBudgetRule) => {
    setEditRule(r);
    setCreateOpen(true);
  };

  const columns: ColumnDef<AgentBudgetRule>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        sortingFn: "text",
        header: ({ column }) => (
          <DataTableHeader column={column}>Name</DataTableHeader>
        ),
        cell: ({ row }) => <NameCell rule={row.original} />,
      },
      {
        id: "enabled",
        accessorFn: (r) => (r.enabled ? 1 : 0),
        sortingFn: "basic",
        header: ({ column }) => (
          <DataTableHeader column={column}>Enabled</DataTableHeader>
        ),
        cell: ({ row }) => <EnabledCell rule={row.original} />,
      },
      {
        id: "targetGroups",
        accessorFn: (r) => r.targetGroups.length,
        sortingFn: "basic",
        header: ({ column }) => (
          <DataTableHeader column={column}>Target Groups</DataTableHeader>
        ),
        cell: ({ row }) => <TargetGroupsCell rule={row.original} />,
      },
      {
        id: "targetUsers",
        accessorFn: (r) => r.targetUsers.length,
        sortingFn: "basic",
        header: ({ column }) => (
          <DataTableHeader column={column}>Target Users</DataTableHeader>
        ),
        cell: ({ row }) => <TargetUsersCell rule={row.original} />,
      },
      {
        id: "tokenCap",
        accessorFn: (r) =>
          r.limits.tokenLimit.enabled ? r.limits.tokenLimit.groupCap : 0,
        sortingFn: "basic",
        header: ({ column }) => (
          <DataTableHeader column={column}>Token Cap</DataTableHeader>
        ),
        cell: ({ row }) => <TokenCapCell rule={row.original} />,
      },
      {
        id: "budgetCap",
        accessorFn: (r) =>
          r.limits.budgetLimit.enabled ? r.limits.budgetLimit.groupCapUsd : 0,
        sortingFn: "basic",
        header: ({ column }) => (
          <DataTableHeader column={column}>Budget Cap</DataTableHeader>
        ),
        cell: ({ row }) => <BudgetCapCell rule={row.original} />,
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        sortingFn: "datetime",
        header: ({ column }) => (
          <DataTableHeader column={column}>Updated</DataTableHeader>
        ),
        cell: ({ row }) => <UpdatedCell rule={row.original} />,
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "",
        cell: ({ row }) => (
          <ActionsCell rule={row.original} onEdit={(r) => openEdit(r)} />
        ),
      },
    ],
    [],
  );

  return (
    <>
      {createOpen && (
        <AgentBudgetRuleModal
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) {
              setEditRule(undefined);
            }
          }}
          rule={editRule}
        />
      )}

      <DataTable
        isLoading={budgetRulesLoading}
        text={"Global Limits"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={budgetRules}
        searchPlaceholder={"Search global limits by name..."}
        onRowClick={(row) => openEdit(row.original)}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <SlidersHorizontal
                    className={"fill-nb-gray-200"}
                    size={20}
                  />
                }
                color={"gray"}
                size={"large"}
              />
            }
            title={"Set a Global Limit"}
            description={
              "Global limits cap token usage and spend across every policy. Apply a limit account-wide, or scope it to specific groups or users."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => {
                  setEditRule(undefined);
                  setCreateOpen(true);
                }}
              >
                <PlusCircle size={16} />
                Add Global Limit
              </Button>
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
        rightSide={() =>
          budgetRules.length > 0 && (
            <div className={cn("gap-x-4 ml-auto flex")}>
              <Button
                variant={"primary"}
                onClick={() => {
                  setEditRule(undefined);
                  setCreateOpen(true);
                }}
              >
                <IconCirclePlus size={16} />
                Add Global Limit
              </Button>
            </div>
          )
        }
        initialPageSize={25}
      />
    </>
  );
}
