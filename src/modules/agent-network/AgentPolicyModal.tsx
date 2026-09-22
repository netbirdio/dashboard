"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
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
import { Textarea } from "@components/Textarea";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { Command, CommandGroup, CommandInput, CommandList } from "cmdk";
import {
  ArrowRightLeft,
  ChevronsUpDown,
  CircleUser,
  ExternalLinkIcon,
  FolderDown,
  Gauge,
  PlusCircle,
  SearchIcon,
  ShieldHalf,
  Sparkles,
  XIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { useElementSize } from "@/hooks/useElementSize";
import { Group } from "@/interfaces/Group";
import AgentPolicyGuardrailsTab from "@/modules/agent-network/AgentPolicyGuardrailsTab";
import AgentPolicyLimitsTab from "@/modules/agent-network/AgentPolicyLimitsTab";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  AgentPolicy,
  AIProvider,
  EMPTY_POLICY_LIMITS,
  PolicyLimits,
} from "@/modules/agent-network/data/mockData";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: AgentPolicy;
  // Values to open a CREATE on — the control center's canvas prefills both
  // sides when a group is connected to a provider. Unlike `policy` it never
  // turns the save into an update.
  initial?: Partial<Omit<AgentPolicy, "id">>;
  // Providers that exist only in a draft changeset: they are not in the
  // account's list yet, so nothing would render the one a policy names.
  extraProviders?: AIProvider[];
  // Policy names the account list doesn't know about (a draft's canvas), so a
  // suggested name doesn't collide with one.
  takenNames?: string[];
  initialTab?: string;
  // Asked before the save runs, for hosts where writing straight to the
  // account deserves a confirmation — the control center in live mode.
  onBeforeSave?: () => Promise<boolean> | boolean;
  // false hands the assembled policy to onDraftSubmit instead of writing it:
  // the control center's draft records it as a change and deploys it later.
  useSave?: boolean;
  onDraftSubmit?: (policy: Omit<AgentPolicy, "id">) => void;
};

export default function AgentPolicyModal({
  open,
  onOpenChange,
  policy,
  initial,
  extraProviders,
  takenNames,
  initialTab,
  onBeforeSave,
  useSave = true,
  onDraftSubmit,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <AgentPolicyModalContent
          policy={policy}
          initial={initial}
          extraProviders={extraProviders}
          takenNames={takenNames}
          initialTab={initialTab}
          onBeforeSave={onBeforeSave}
          useSave={useSave}
          onDraftSubmit={onDraftSubmit}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
}

function AgentPolicyModalContent({
  policy,
  initial,
  extraProviders,
  takenNames,
  initialTab,
  onBeforeSave,
  useSave = true,
  onDraftSubmit,
  onSuccess,
}: {
  policy?: AgentPolicy;
  initial?: Partial<Omit<AgentPolicy, "id">>;
  extraProviders?: AIProvider[];
  takenNames?: string[];
  initialTab?: string;
  onBeforeSave?: () => Promise<boolean> | boolean;
  useSave?: boolean;
  onDraftSubmit?: (policy: Omit<AgentPolicy, "id">) => void;
  onSuccess: () => void;
}) {
  const {
    providers: accountProviders,
    addPolicy,
    updatePolicy,
    policies,
  } = useAIProviders();
  // A draft provider is not in the account list, so without this the policy
  // that names it shows an empty Provider field.
  const providers = useMemo(
    () => [
      ...accountProviders,
      ...(extraProviders ?? []).filter(
        (e) => !accountProviders.some((p) => p.id === e.id),
      ),
    ],
    [accountProviders, extraProviders],
  );
  const { dropdownOptions } = useGroups();
  const { mutate } = useSWRConfig();

  // An edit reads its values off the record; a prefilled create off `initial`.
  const seed = policy ?? initial;
  const [tab, setTab] = useState<string>(initialTab ?? "policy");
  const [name, setName] = useState(seed?.name ?? "");
  const [description, setDescription] = useState(seed?.description ?? "");
  // Enabled is no longer surfaced as a UI toggle in the modal — new
  // policies default to enabled, edits preserve the existing value.
  const enabled = seed?.enabled ?? true;
  // Source groups go through useGroupHelper so any new (id-less) group
  // gets created against /groups before we save the policy — same flow as
  // the Access Control policy modal. Dashboard caps source-groups to 1
  // entry in v1 (the backend type stays a list for forward compat); a
  // wrapper setter clamps additions to the most recently selected group.
  // Legacy policies with >1 source group flow through unmodified until
  // the operator opens the modal — at which point the warning surfaces
  // and the next save trims to the first group.
  const [
    sourceGroupsRaw,
    setSourceGroupsRaw,
    { getGroupsToUpdate: getSourceGroupsToUpdate },
  ] = useGroupHelper({
    // Refs, not plain ids: a draft group is named rather than identified, and
    // useGroupHelper resolves strings by id only. The dropdown options carry
    // the draft groups the control center added, so resolve against those.
    initial: (seed?.sourceGroups ?? []).flatMap((ref) => {
      const byId = dropdownOptions.find((g) => g.id === ref);
      if (byId) return [byId];
      const byName = dropdownOptions.find((g) => !g.id && g.name === ref);
      if (byName) return [byName];
      // A ref that resolves to nothing is a group that is gone, NOT a group to
      // invent: turning it into an id-less entry would have the save POST a
      // brand-new group named after the missing group's id.
      return [];
    }),
  });
  const sourceGroups = sourceGroupsRaw;
  const setSourceGroups: React.Dispatch<React.SetStateAction<Group[]>> = (
    next,
  ) => {
    setSourceGroupsRaw((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved.length <= 1) return resolved;
      // When the user picks a new entry on top of an existing one, keep
      // the latest. When legacy data lands, drop everything but the
      // first so the tooltip stays consistent with what'll be saved.
      const grew = resolved.length > prev.length;
      return grew ? resolved.slice(-1) : resolved.slice(0, 1);
    });
  };
  const hasLegacyExtraGroups = sourceGroupsRaw.length > 1;
  const [destinationProviderIds, setDestinationProviderIds] = useState<
    string[]
  >(seed?.destinationProviderIds ?? []);
  const [guardrailIds, setGuardrailIds] = useState<string[]>(
    seed?.guardrailIds ?? [],
  );
  const [limits, setLimits] = useState<PolicyLimits>(
    seed?.limits ?? EMPTY_POLICY_LIMITS,
  );

  const canContinueFromPolicy = useMemo(
    () => sourceGroups.length > 0 && destinationProviderIds.length > 0,
    [sourceGroups, destinationProviderIds],
  );

  // Auto-populate the policy name from the first selected source group and
  // first selected provider until the user types into the Name field.
  const userEditedName = useRef(Boolean(seed?.name));
  const suggestedName = useMemo(() => {
    if (sourceGroups.length === 0 || destinationProviderIds.length === 0) {
      return "";
    }
    const provider = providers.find((p) => p.id === destinationProviderIds[0]);
    const base = `${sourceGroups[0].name} → ${provider?.name ?? ""}`.trim();
    // Same shape the canvas uses for every other new entity: the first
    // collision becomes "… (1)".
    const taken = new Set([
      ...policies.filter((p) => p.id !== policy?.id).map((p) => p.name),
      ...(takenNames ?? []),
    ]);
    let name = base;
    let i = 1;
    while (taken.has(name)) name = `${base} (${i++})`;
    return name;
  }, [
    sourceGroups,
    destinationProviderIds,
    providers,
    policies,
    policy?.id,
    takenNames,
  ]);

  useEffect(() => {
    if (policy) return;
    if (userEditedName.current) return;
    setName(suggestedName);
  }, [suggestedName, policy]);

  const submitDisabled = useMemo(() => {
    if (name.trim().length === 0) return true;
    if (!canContinueFromPolicy) return true;
    return false;
  }, [name, canContinueFromPolicy]);

  const handleSubmit = async () => {
    if (onBeforeSave && !(await onBeforeSave())) return;

    // Trim to the first group on save: handles the legacy >1 case
    // where the warning was shown but the operator hit Save without
    // editing the source field.
    const sourceGroup = sourceGroups[0];

    // Draft: no request at all — creating the group here would write to the
    // account from a draft. An id-less group travels as its NAME, the same ref
    // an access-control policy carries, and the deploy resolves it against the
    // create-group change that lands first.
    if (!useSave) {
      onDraftSubmit?.({
        name,
        description,
        enabled,
        sourceGroups: sourceGroup ? [sourceGroup.id ?? sourceGroup.name] : [],
        destinationProviderIds,
        guardrailIds,
        limits,
      });
      onSuccess();
      return;
    }

    // Mirror Access Control's flow: create any newly-named groups first,
    // refresh the /groups SWR cache so freshly-created entries are
    // resolvable in the table, then post the policy with all ids known.
    const calls = getSourceGroupsToUpdate().map((g) => g.promise());
    const created = (await Promise.all(calls).then((groups) => {
      mutate("/groups");
      return groups;
    })) as Group[];

    const sourceGroupIds = (sourceGroup ? [sourceGroup] : [])
      .map((g) => g.id ?? created.find((c) => c.name === g.name)?.id)
      .filter((id): id is string => Boolean(id));

    const next = {
      name,
      description,
      enabled,
      sourceGroups: sourceGroupIds,
      destinationProviderIds,
      guardrailIds,
      limits,
    };

    if (policy) {
      await updatePolicy(policy.id, next);
    } else {
      await addPolicy(next);
    }
    onSuccess();
  };

  return (
    <ModalContent maxWidthClass={"max-w-3xl"}>
      <ModalHeader
        icon={<AccessControlIcon className={"fill-netbird"} />}
        title={policy ? "Update Agent Policy" : "Create Agent Policy"}
        description={
          "Govern which groups can call which AI providers and under what guardrails."
        }
        color={"netbird"}
      />

      <Tabs defaultValue={tab} onValueChange={setTab} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"policy"}>
            <ArrowRightLeft size={16} />
            Policy
          </TabsTrigger>
          <TabsTrigger value={"limits"}>
            <Gauge size={16} />
            Limits
          </TabsTrigger>
          <TabsTrigger value={"guardrails"}>
            <ShieldHalf size={16} />
            Guardrails
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"policy"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div className={"flex gap-6 items-start"}>
              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <FolderDown size={15} />
                  Source
                  <HelpTooltip
                    content={
                      <>
                        Group of users this policy authorises to call the
                        destination providers. One group per policy in this
                        release.
                      </>
                    }
                  />
                </Label>
                <SourceGroupsSelector
                  value={sourceGroups}
                  onChange={setSourceGroups}
                />
                {hasLegacyExtraGroups && (
                  <div className={"mt-2 text-xs text-yellow-400 leading-snug"}>
                    This policy was created with multiple source groups. Only
                    the first group is kept on save —{" "}
                    {sourceGroupsRaw[0]?.name ?? "—"} will be retained, the
                    others removed.
                  </div>
                )}
              </div>

              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <Sparkles size={15} />
                  Provider
                  <HelpTooltip
                    content={<>AI providers the source is allowed to reach.</>}
                  />
                </Label>
                <ProviderMultiSelect
                  providers={providers}
                  value={destinationProviderIds}
                  onChange={setDestinationProviderIds}
                />
              </div>
            </div>

            <div>
              <Label>Name of the Policy</Label>
              <HelpText>
                Set an easily identifiable name for your policy.
              </HelpText>
              <Input
                value={name}
                onChange={(e) => {
                  userEditedName.current = true;
                  setName(e.target.value);
                }}
                placeholder={"e.g. Engineering → OpenAI"}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this policy.
              </HelpText>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  "e.g., Engineers can call OpenAI under production guardrails."
                }
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        <AgentPolicyLimitsTab limits={limits} setLimits={setLimits} />

        <AgentPolicyGuardrailsTab
          guardrailIds={guardrailIds}
          setGuardrailIds={setGuardrailIds}
          destinationProviderIds={destinationProviderIds}
        />
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
          {!policy ? (
            <>
              {tab === "policy" && (
                <>
                  <ModalClose asChild>
                    <Button variant={"secondary"}>Cancel</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("limits")}
                    disabled={
                      !canContinueFromPolicy || name.trim().length === 0
                    }
                  >
                    Continue
                  </Button>
                </>
              )}
              {tab === "limits" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("policy")}
                  >
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("guardrails")}
                  >
                    Continue
                  </Button>
                </>
              )}
              {tab === "guardrails" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("limits")}
                  >
                    Back
                  </Button>
                  <Button
                    variant={"primary"}
                    onClick={handleSubmit}
                    disabled={submitDisabled}
                  >
                    <PlusCircle size={16} />
                    Add Policy
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

function SourceGroupsSelector({
  value,
  onChange,
}: {
  value: Group[];
  onChange: React.Dispatch<React.SetStateAction<Group[]>>;
}) {
  const { users } = useUsers();
  return (
    <PeerGroupSelector
      popoverWidth={500}
      placeholder={
        <div className={"flex items-center gap-2"}>
          <Badge className={"py-[3px]"} variant={"gray-ghost"}>
            <CircleUser size={12} />
            All
          </Badge>
          Select source group(s)...
        </div>
      }
      values={value}
      onChange={onChange}
      users={users}
      hideAllGroup={true}
    />
  );
}

// A provider that exists only in a draft changeset carries a client id.
const isDraftProvider = (p: AIProvider) => p.id.startsWith("new-");

function ProviderMultiSelect({
  providers,
  value,
  onChange,
}: {
  providers: AIProvider[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  // The popover is sized to the trigger, the way every other multi-select in
  // the dashboard sizes its list.
  const [inputRef, { width }] = useElementSize<HTMLButtonElement>();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return providers;
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.providerId.toLowerCase().includes(query),
    );
  }, [providers, search]);

  const selected = useMemo(
    () =>
      value.flatMap((id) => {
        const p = providers.find((pp) => pp.id === id);
        return p ? [p] : [];
      }),
    [value, providers],
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
            {selected.length === 0 ? (
              // Keyed on what actually renders, not on `value`: an id whose
              // provider is gone would otherwise leave the trigger blank.
              <span className={"pl-1"}>Select provider(s)...</span>
            ) : (
              selected.map((p) => (
                <Badge
                  key={p.id}
                  variant={"gray-ghost"}
                  className={"py-[3px] whitespace-nowrap"}
                  useHover
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(value.filter((v) => v !== p.id));
                  }}
                >
                  <AIProviderLogo providerId={p.providerId} size={12} />
                  {p.name}
                  {isDraftProvider(p) && <SmallBadge />}
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
                placeholder={"Search providers..."}
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
                    {providers.length === 0
                      ? "No providers connected yet."
                      : "No providers found."}
                  </div>
                )}
                {filtered.map((p) => {
                  const isSelected = value.includes(p.id);
                  return (
                    <CommandItem
                      key={p.id}
                      value={p.id}
                      onSelect={() => toggle(p.id)}
                      onClick={(e) => e.preventDefault()}
                    >
                      <div className={"flex items-center gap-2.5 min-w-0"}>
                        <AIProviderLogo providerId={p.providerId} size={14} />
                        <span className={"text-sm text-nb-gray-100 truncate"}>
                          {p.name}
                        </span>
                        {isDraftProvider(p) && <SmallBadge />}
                      </div>
                      <Checkbox checked={isSelected} />
                    </CommandItem>
                  );
                })}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
