"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Checkbox } from "@components/Checkbox";
import { CommandItem } from "@components/Command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { ScrollArea } from "@components/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { UserListItem } from "@components/UserSelector";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import {
  ChevronsUpDown,
  CircleUser,
  ExternalLinkIcon,
  Gauge,
  PlusCircle,
  SearchIcon,
  SlidersHorizontal,
  Users2,
  XIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useUsers } from "@/contexts/UsersProvider";
import { useElementSize } from "@/hooks/useElementSize";
import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";
import AgentPolicyLimitsTab from "@/modules/agent-network/AgentPolicyLimitsTab";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  AgentBudgetRule,
  EMPTY_POLICY_LIMITS,
  PolicyLimits,
} from "@/modules/agent-network/data/mockData";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";

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

  const hasAnyLimit = limits.tokenLimit.enabled || limits.budgetLimit.enabled;

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
          "Token and budget caps, applied account-wide or scoped to groups and users."
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
                        Restrict this rule to members of the selected groups.
                        Leave empty (and no users) to apply account-wide.
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
                        Restrict this rule to specific users. Leave empty (and
                        no groups) to apply account-wide.
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
              <Callout variant={"warning"}>
                With no targets selected, this rule applies{" "}
                <span className={"font-medium"}>account-wide</span> — every
                agent-network request is counted against its caps.
              </Callout>
            )}
          </div>
        </TabsContent>

        <AgentPolicyLimitsTab limits={limits} setLimits={setLimits} />
      </Tabs>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/agent-network"}
              target={"_blank"}
            >
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
                  <Button variant={"secondary"} onClick={() => setTab("rule")}>
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
  // The popover is sized to the trigger, the way every other multi-select in
  // the dashboard sizes its list.
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  // Service users have no one to bill, so they are never a rule's target.
  const selectable = useMemo(
    () => users.filter((u) => !u.is_service_user),
    [users],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return selectable;
    return selectable.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query),
    );
  }, [selectable, search]);

  const selectedUsers = useMemo(
    () =>
      value
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean) as User[],
    [users, value],
  );

  const toggle = (id: string) => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setTimeout(() => setSearch(""), 200);
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={inputRef}
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
                    onChange(value.filter((v) => v !== u.id));
                  }}
                >
                  <SmallUserAvatar
                    name={u.name}
                    email={u.email}
                    id={u.id}
                    className={"w-4 h-4 text-[8px]"}
                  />
                  {u.name || u.email || u.id}
                  <XIcon
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
      </PopoverTrigger>
      <PopoverContent
        className={"w-full p-0 shadow-sm shadow-nb-gray-950"}
        style={{ width }}
        align={"start"}
        sideOffset={10}
      >
        <Command className={"w-full flex"} loop shouldFilter={false}>
          <CommandList className={"w-full"}>
            <div className={"relative"}>
              <CommandInput
                className={cn(
                  "min-h-[42px] w-full relative",
                  "border-b-0 border-t-0 border-r-0 border-l-0 border-neutral-200 dark:border-nb-gray-700 items-center",
                  "bg-transparent text-sm outline-none focus-visible:outline-none ring-0 focus-visible:ring-0",
                  "dark:placeholder:text-nb-gray-400 font-light placeholder:text-neutral-500 pl-10",
                )}
                value={search}
                onValueChange={setSearch}
                placeholder={"Search users by name or email..."}
              />
              <div
                className={
                  "absolute left-0 top-0 h-full flex items-center pl-4"
                }
              >
                <SearchIcon size={14} />
              </div>
            </div>
            <CommandGroup>
              <ScrollArea
                className={
                  "max-h-[195px] overflow-y-auto flex flex-col gap-1 pl-2 py-2 pr-3"
                }
              >
                {filtered.length === 0 && (
                  <div className={"text-xs text-nb-gray-400 px-3 py-3"}>
                    {selectable.length === 0
                      ? "No users to select yet."
                      : "No users match."}
                  </div>
                )}
                {filtered.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={u.id}
                    onSelect={() => toggle(u.id)}
                    onClick={(e) => e.preventDefault()}
                  >
                    <div className={"min-w-0 flex-1"}>
                      <UserListItem user={u} className={"bg-nb-gray-800"} />
                    </div>
                    <Checkbox checked={value.includes(u.id)} />
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
