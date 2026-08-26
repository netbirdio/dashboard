"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { cn } from "@utils/helpers";
import {
  ChevronsUpDown,
  CircleUser,
  ExternalLinkIcon,
  Gauge,
  PlusCircle,
  SlidersHorizontal,
  Users2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import AgentPolicyLimitsTab from "@/modules/agent-network/AgentPolicyLimitsTab";
import {
  AgentBudgetRule,
  EMPTY_POLICY_LIMITS,
  PolicyLimits,
} from "@/modules/agent-network/data/mockData";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AgentBudgetRule;
  initialTab?: string;
};

export default function AgentBudgetRuleModal({
  open,
  onOpenChange,
  rule,
  initialTab,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <AgentBudgetRuleModalContent
          rule={rule}
          initialTab={initialTab}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
}

function AgentBudgetRuleModalContent({
  rule,
  initialTab,
  onSuccess,
}: {
  rule?: AgentBudgetRule;
  initialTab?: string;
  onSuccess: () => void;
}) {
  const { addBudgetRule, updateBudgetRule } = useAIProviders();
  const { mutate } = useSWRConfig();
  const { users: allUsers } = useUsers();

  const [tab, setTab] = useState<string>(initialTab ?? "rule");
  const [name, setName] = useState(rule?.name ?? "");
  const enabled = rule?.enabled ?? true;

  const [
    targetGroupsRaw,
    setTargetGroupsRaw,
    { getGroupsToUpdate: getTargetGroupsToUpdate },
  ] = useGroupHelper({
    initial: rule?.targetGroups ?? [],
  });
  const [targetUserIds, setTargetUserIds] = useState<string[]>(
    rule?.targetUsers ?? [],
  );
  const [limits, setLimits] = useState<PolicyLimits>(
    rule?.limits ?? EMPTY_POLICY_LIMITS,
  );

  const accountWide =
    targetGroupsRaw.length === 0 && targetUserIds.length === 0;

  const hasAnyLimit =
    limits.tokenLimit.enabled || limits.budgetLimit.enabled;

  const submitDisabled = useMemo(() => {
    if (name.trim().length === 0) return true;
    if (!hasAnyLimit) return true;
    return false;
  }, [name, hasAnyLimit]);

  const handleSubmit = async () => {
    const calls = getTargetGroupsToUpdate().map((g) => g.promise());
    const created = (await Promise.all(calls).then((groups) => {
      mutate("/groups");
      return groups;
    })) as Group[];

    const targetGroupIds = targetGroupsRaw
      .map((g) => {
        if (g.id) return g.id;
        const match = created.find((c) => c.name === g.name);
        return match?.id;
      })
      .filter((id): id is string => Boolean(id));

    if (rule) {
      await updateBudgetRule(rule.id, {
        name,
        enabled,
        targetGroups: targetGroupIds,
        targetUsers: targetUserIds,
        limits,
      });
    } else {
      await addBudgetRule({
        name,
        enabled,
        targetGroups: targetGroupIds,
        targetUsers: targetUserIds,
        limits,
      });
    }
    onSuccess();
  };

  return (
    <ModalContent maxWidthClass={"max-w-3xl"}>
      <ModalHeader
        icon={<SlidersHorizontal size={19} />}
        title={rule ? "Update Global Limit" : "Create Global Limit"}
        description={
          "Account-level token and budget caps. Apply account-wide or scope to specific groups or users."
        }
        color={"netbird"}
      />

      <Tabs defaultValue={tab} onValueChange={setTab} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"rule"}>
            <SlidersHorizontal size={16} />
            Rule
          </TabsTrigger>
          <TabsTrigger value={"limits"}>
            <Gauge size={16} />
            Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"rule"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6 pt-2"}>
            <div>
              <Label>Name of the Global Limit</Label>
              <HelpText>
                Set an easily identifiable name for this limit.
              </HelpText>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={"e.g. Account-wide monthly cap"}
                data-testid={"budget-rule-name"}
              />
            </div>

            <div className={"flex gap-6 items-start"}>
              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <Users2 size={15} />
                  Target Groups
                  <HelpTooltip
                    content={
                      <>
                        Restrict this rule to members of the selected
                        groups. Leave empty (and no users) to apply
                        account-wide.
                      </>
                    }
                  />
                </Label>
                <PeerGroupSelector
                  popoverWidth={500}
                  placeholder={
                    <div className={"flex items-center gap-2"}>
                      <Badge className={"py-[3px]"} variant={"gray-ghost"}>
                        <CircleUser size={12} />
                        All
                      </Badge>
                      Select target group(s)...
                    </div>
                  }
                  values={targetGroupsRaw}
                  onChange={setTargetGroupsRaw}
                  hideAllGroup={true}
                />
              </div>

              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <CircleUser size={15} />
                  Target Users
                  <HelpTooltip
                    content={
                      <>
                        Restrict this rule to specific users. Leave empty
                        (and no groups) to apply account-wide.
                      </>
                    }
                  />
                </Label>
                <UserMultiSelect
                  users={allUsers ?? []}
                  value={targetUserIds}
                  onChange={setTargetUserIds}
                />
              </div>
            </div>

            {accountWide && (
              <div className={"text-xs text-nb-gray-300 leading-snug"}>
                With no targets selected, this rule applies{" "}
                <span className={"text-amber-400 font-medium"}>
                  account-wide
                </span>{" "}
                — every agent-network request is counted against its
                caps.
              </div>
            )}
          </div>
        </TabsContent>

        <AgentPolicyLimitsTab limits={limits} setLimits={setLimits} />
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={"https://docs.netbird.io/"} target={"_blank"}>
              Agent Network
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {!rule ? (
            <>
              {tab === "rule" && (
                <>
                  <ModalClose asChild>
                    <Button variant={"secondary"}>Cancel</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("limits")}
                    disabled={name.trim().length === 0}
                  >
                    Continue
                  </Button>
                </>
              )}
              {tab === "limits" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("rule")}
                  >
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    onClick={handleSubmit}
                    disabled={submitDisabled}
                  >
                    <PlusCircle size={16} />
                    {rule ? "Save Global Limit" : "Add Global Limit"}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <ModalClose asChild>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={handleSubmit}
                disabled={submitDisabled}
              >
                Save Changes
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

function UserMultiSelect({
  users,
  value,
  onChange,
}: {
  users: User[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  const removeOne = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const usable = users.filter((u) => !u.is_service_user);
    if (!q) return usable;
    return usable.filter((u) => {
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    });
  }, [users, query]);

  const selectedUsers = useMemo(
    () => value.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[],
    [users, value],
  );

  return (
    <div ref={containerRef} className={"relative"}>
      <button
        type={"button"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "min-h-[46px] w-full relative items-center group",
          "border border-neutral-200 dark:border-nb-gray-700 justify-between py-2 px-3",
          "rounded-md bg-white text-sm dark:bg-nb-gray-900/40 flex dark:text-neutral-400/70 text-neutral-500 cursor-pointer hover:dark:bg-nb-gray-900/50",
          "transition-all",
        )}
      >
        <div
          className={
            "flex items-center gap-2 border-nb-gray-700 flex-wrap h-full"
          }
        >
          {selectedUsers.length === 0 ? (
            <span className={"pl-1"}>Select user(s)...</span>
          ) : (
            selectedUsers.map((u) => (
              <Badge
                key={u.id}
                variant={"gray-ghost"}
                className={"py-[3px] whitespace-nowrap"}
                useHover
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeOne(u.id);
                }}
              >
                <CircleUser size={12} />
                {u.name || u.email || u.id}
                <X
                  size={12}
                  className={
                    "cursor-pointer group-hover:text-nb-gray-100 transition-all shrink-0"
                  }
                />
              </Badge>
            ))
          )}
        </div>
        <div className={"pl-2"}>
          <ChevronsUpDown
            size={18}
            className={"shrink-0 group-hover:text-nb-gray-300 transition-all"}
          />
        </div>
      </button>
      {open && (
        <div
          className={
            "absolute z-50 mt-1 w-full bg-nb-gray-950 border border-nb-gray-800 rounded-md shadow-lg max-h-[300px] overflow-hidden flex flex-col"
          }
        >
          <div className={"p-2 border-b border-nb-gray-800"}>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={"Search users..."}
            />
          </div>
          <div className={"overflow-y-auto p-1"}>
            {filtered.length === 0 ? (
              <div className={"text-xs text-nb-gray-400 px-3 py-3"}>
                No users match.
              </div>
            ) : (
              filtered.map((u) => {
                const checked = value.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                      checked
                        ? "bg-netbird/10"
                        : "hover:bg-nb-gray-900/50",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(u.id)}
                    />
                    <CircleUser size={16} className={"text-nb-gray-400"} />
                    <div className={"flex-1 min-w-0"}>
                      <div className={"text-sm text-white truncate"}>
                        {u.name || u.email || u.id}
                      </div>
                      {u.email && u.name && (
                        <div className={"text-xs text-nb-gray-400 truncate"}>
                          {u.email}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
