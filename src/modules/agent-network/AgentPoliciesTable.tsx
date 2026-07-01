"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import {
  CheckboxListPicker,
  formatCheckboxChip,
} from "@components/table/filters/CheckboxListPicker";
import {
  formatGroupsChip,
  GroupsPicker,
} from "@components/table/filters/GroupsPicker";
import {
  TableFilterChips,
  TableFilterDef,
  TableFiltersButton,
} from "@components/table/TableFilters";
import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import GetStartedTest from "@components/ui/GetStartedTest";
import MultipleGroups from "@components/ui/MultipleGroups";
import { IconCirclePlus } from "@tabler/icons-react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import {
  ExternalLinkIcon,
  Gauge,
  MoreVertical,
  PencilLineIcon,
  PlusCircle,
  Power,
  Trash2,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Group } from "@/interfaces/Group";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import {
  AgentPolicy,
  MOCK_GROUPS,
  PolicyBudgetLimit,
  PolicyTokenLimit,
} from "@/modules/agent-network/data/mockData";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import AgentPolicyModal from "@/modules/agent-network/AgentPolicyModal";

function NameCell({ policy }: { policy: AgentPolicy }) {
  return (
    <ActiveInactiveRow
      active={policy.enabled}
      inactiveDot={"gray"}
      text={policy.name}
      data-testid={policy.name}
    >
      <DescriptionWithTooltip
        className={"mt-1"}
        text={policy.description}
        maxChars={30}
      />
    </ActiveInactiveRow>
  );
}

function SourceCell({ policy }: { policy: AgentPolicy }) {
  const { groups: realGroups } = useGroups();
  if (policy.sourceGroups.length === 0) return <EmptyRow />;
  const groups: Group[] = policy.sourceGroups.map((id) => {
    const real = realGroups?.find((g) => g.id === id);
    if (real) return real;
    const mock = MOCK_GROUPS.find((g) => g.id === id);
    return { id, name: mock?.name ?? id, peers_count: 0 } as Group;
  });
  return (
    <MultipleGroups
      groups={groups}
      label={"Source Groups"}
      description={
        "Members of these groups are allowed to call the destination providers."
      }
    />
  );
}

function ProviderCell({ policy }: { policy: AgentPolicy }) {
  const { providers } = useAIProviders();
  if (policy.destinationProviderIds.length === 0) return <EmptyRow />;
  const items = policy.destinationProviderIds
    .map((id) => providers.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (items.length === 0) return <EmptyRow />;
  const first = items[0];
  const rest = items.slice(1);
  return (
    <div className={"flex"}>
      <div className={"inline-flex items-center gap-2 z-0"}>
        <Badge
          variant={"gray-ghost"}
          useHover={true}
          className={"transition-all whitespace-nowrap"}
        >
          <AIProviderLogo providerId={first.providerId} size={12} />
          {first.name}
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
    </div>
  );
}

function LimitsCell({
  policy,
  onClickAdd,
}: {
  policy: AgentPolicy;
  onClickAdd: () => void;
}) {
  const tokenOn = policy.limits.tokenLimit.enabled;
  const budgetOn = policy.limits.budgetLimit.enabled;

  if (!tokenOn && !budgetOn) {
    return (
      <div className={"flex"}>
        <Badge
          variant={"gray"}
          useHover={true}
          onClick={(e) => {
            e.stopPropagation();
            onClickAdd();
          }}
        >
          <IconCirclePlus size={14} />
          Add Limit
        </Badge>
      </div>
    );
  }
  const tl = policy.limits.tokenLimit;
  const bl = policy.limits.budgetLimit;
  return (
    <div className={"flex gap-1.5 flex-wrap"}>
      {tokenOn && (
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
      )}
      {budgetOn && (
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
      )}
    </div>
  );
}

function formatTokenLimit(l: PolicyTokenLimit): string {
  return `${capDisplay(l.groupCap, false)} · ${capDisplay(l.userCap, false)}`;
}

function formatBudgetLimit(l: PolicyBudgetLimit): string {
  return `${capDisplay(l.groupCapUsd, true)} · ${capDisplay(
    l.userCapUsd,
    true,
  )}`;
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
  policy,
  onEdit,
}: {
  policy: AgentPolicy;
  onEdit: (p: AgentPolicy) => void;
}) {
  const { confirm } = useDialog();
  const { togglePolicy, deletePolicy } = useAIProviders();

  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete '${policy.name}'?`,
      description:
        "Are you sure you want to delete this policy? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!ok) return;
    deletePolicy(policy.id);
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
          <DropdownMenuItem onClick={() => onEdit(policy)}>
            <div className={"flex gap-3 items-center"}>
              <PencilLineIcon size={14} className={"shrink-0"} />
              Edit Policy
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => togglePolicy(policy.id)}>
            <div className={"flex gap-3 items-center"}>
              <Power size={14} className={"shrink-0"} />
              {policy.enabled ? "Disable" : "Enable"}
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

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function AgentPoliciesTable({ headingTarget }: Readonly<Props>) {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link: the access log links here with ?search=<policy name> so the
  // table opens pre-filtered to that policy.
  const initialSearch = searchParams.get("search") ?? undefined;
  const { policies, isLoading, providers } = useAIProviders();
  const { groups: realGroups } = useGroups();

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "name", desc: false }],
  );

  // Resolve a policy's source-group ids to names so the Groups filter can match
  // against the same names the GroupsPicker offers.
  const groupName = (id: string) =>
    realGroups?.find((g) => g.id === id)?.name ??
    MOCK_GROUPS.find((g) => g.id === id)?.name ??
    id;

  const providerOptions = useMemo(
    () => (providers ?? []).map((p) => ({ value: p.id, label: p.name })),
    [providers],
  );

  const filterDefs = useMemo<TableFilterDef[]>(
    () => [
      {
        id: "source_group_names",
        label: "Groups",
        renderPicker: (p) => (
          <GroupsPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
            close={p.close}
            groups={realGroups}
          />
        ),
        formatChip: (v) => formatGroupsChip(v as string[] | undefined),
      },
      {
        id: "provider_ids",
        label: "Providers",
        renderPicker: (p) => (
          <CheckboxListPicker
            value={p.value as string[] | undefined}
            onChange={p.onChange}
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
    ],
    [realGroups, providerOptions],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<AgentPolicy | undefined>(
    undefined,
  );
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);

  const openEdit = (p: AgentPolicy, tab?: string) => {
    setEditPolicy(p);
    setInitialTab(tab);
    setCreateOpen(true);
  };

  const columns: ColumnDef<AgentPolicy>[] = [
    {
      id: "name",
      accessorKey: "name",
      sortingFn: "text",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      cell: ({ row }) => <NameCell policy={row.original} />,
    },
    {
      id: "sources",
      accessorFn: (p) => p.sourceGroups.length,
      sortingFn: "basic",
      header: ({ column }) => (
        <DataTableHeader column={column}>Groups</DataTableHeader>
      ),
      cell: ({ row }) => <SourceCell policy={row.original} />,
    },
    {
      id: "providers",
      accessorFn: (p) => p.destinationProviderIds.length,
      sortingFn: "basic",
      header: ({ column }) => (
        <DataTableHeader column={column}>Provider</DataTableHeader>
      ),
      cell: ({ row }) => <ProviderCell policy={row.original} />,
    },
    // Hidden filter-only columns powering the consolidated Filters UI.
    {
      id: "source_group_names",
      accessorFn: (p) => p.sourceGroups.map(groupName),
      filterFn: "arrIncludesSome",
    },
    {
      id: "provider_ids",
      accessorFn: (p) => p.destinationProviderIds,
      filterFn: "arrIncludesSome",
    },
    {
      id: "limits",
      accessorFn: (p) =>
        (p.limits.tokenLimit.enabled ? 1 : 0) +
        (p.limits.budgetLimit.enabled ? 1 : 0),
      sortingFn: "basic",
      header: ({ column }) => (
        <DataTableHeader column={column}>Limits</DataTableHeader>
      ),
      cell: ({ row }) => (
        <LimitsCell
          policy={row.original}
          onClickAdd={() => openEdit(row.original, "limits")}
        />
      ),
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => (
        <ActionsCell policy={row.original} onEdit={(p) => openEdit(p)} />
      ),
    },
  ];

  return (
    <>
      {createOpen && (
        <AgentPolicyModal
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o);
            if (!o) {
              setEditPolicy(undefined);
              setInitialTab(undefined);
            }
          }}
          policy={editPolicy}
          initialTab={initialTab}
        />
      )}

      <DataTable
        // Remount when the deep-linked ?search= param resolves so initialSearch
        // applies even on statically-prerendered loads (where useSearchParams is
        // empty on first render and only populates after hydration).
        key={`policies-${initialSearch ?? ""}`}
        headingTarget={headingTarget}
        isLoading={isLoading}
        text={"Policies"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={policies}
        initialSearch={initialSearch}
        searchPlaceholder={"Search by name or description..."}
        onRowClick={(row) => openEdit(row.original)}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={
                  <AccessControlIcon className={"fill-nb-gray-200"} size={20} />
                }
                color={"gray"}
                size={"large"}
              />
            }
            title={"Create your first policy"}
            description={
              "Policies connect user and agent groups to AI providers, with optional token and budget limits and guardrails for model access and prompt capture."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => {
                  setEditPolicy(undefined);
                  setCreateOpen(true);
                }}
              >
                <PlusCircle size={16} />
                Add Policy
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
          policies.length > 0 && (
            <div className={cn("gap-x-4 ml-auto flex")}>
              <Button
                variant={"primary"}
                onClick={() => {
                  setEditPolicy(undefined);
                  setCreateOpen(true);
                }}
              >
                <PlusCircle size={16} />
                Add Policy
              </Button>
            </div>
          )
        }
        initialPageSize={25}
        // Built-in reset clears column filters + search (and its persisted
        // value). onFilterReset also drops the deep-linked ?search= param so a
        // reset clears it instead of the URL re-seeding the search.
        onFilterReset={() => {
          if (initialSearch) router.replace(path, { scroll: false });
        }}
        columnVisibility={{
          source_group_names: false,
          provider_ids: false,
        }}
        aboveTable={(table) => (
          <TableFilterChips table={table} filters={filterDefs} />
        )}
      >
        {(table) => (
          <TableFiltersButton
            table={table}
            filters={filterDefs}
            disabled={policies.length === 0}
          />
        )}
      </DataTable>
    </>
  );
}
