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
import { Textarea } from "@components/Textarea";
import { cn } from "@utils/helpers";
import {
  ArrowRightLeft,
  ChevronsUpDown,
  CircleUser,
  ExternalLinkIcon,
  FolderDown,
  Gauge,
  PlusCircle,
  ShieldHalf,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import AccessControlIcon from "@/assets/icons/AccessControlIcon";
import { useUsers } from "@/contexts/UsersProvider";
import { Group } from "@/interfaces/Group";
import {
  AgentPolicy,
  AIProvider,
  EMPTY_POLICY_LIMITS,
  PolicyLimits,
} from "@/modules/agent-network/data/mockData";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import AgentPolicyGuardrailsTab from "@/modules/agent-network/AgentPolicyGuardrailsTab";
import AgentPolicyLimitsTab from "@/modules/agent-network/AgentPolicyLimitsTab";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: AgentPolicy;
  initialTab?: string;
};

export default function AgentPolicyModal({
  open,
  onOpenChange,
  policy,
  initialTab,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <AgentPolicyModalContent
          policy={policy}
          initialTab={initialTab}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
}

function AgentPolicyModalContent({
  policy,
  initialTab,
  onSuccess,
}: {
  policy?: AgentPolicy;
  initialTab?: string;
  onSuccess: () => void;
}) {
  const { providers, addPolicy, updatePolicy } = useAIProviders();
  const { mutate } = useSWRConfig();

  const [tab, setTab] = useState<string>(initialTab ?? "policy");
  const [name, setName] = useState(policy?.name ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  // Enabled is no longer surfaced as a UI toggle in the modal — new
  // policies default to enabled, edits preserve the existing value.
  const enabled = policy?.enabled ?? true;
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
    initial: policy?.sourceGroups ?? [],
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
  >(policy?.destinationProviderIds ?? []);
  const [guardrailIds, setGuardrailIds] = useState<string[]>(
    policy?.guardrailIds ?? [],
  );
  const [limits, setLimits] = useState<PolicyLimits>(
    policy?.limits ?? EMPTY_POLICY_LIMITS,
  );

  const canContinueFromPolicy = useMemo(
    () => sourceGroups.length > 0 && destinationProviderIds.length > 0,
    [sourceGroups, destinationProviderIds],
  );

  // Auto-populate the policy name from the first selected source group and
  // first selected provider until the user types into the Name field.
  const userEditedName = useRef(Boolean(policy?.name));
  const suggestedName = useMemo(() => {
    if (sourceGroups.length === 0 || destinationProviderIds.length === 0) {
      return "";
    }
    const provider = providers.find(
      (p) => p.id === destinationProviderIds[0],
    );
    return `${sourceGroups[0].name} → ${provider?.name ?? ""}`.trim();
  }, [sourceGroups, destinationProviderIds, providers]);

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
    // Mirror Access Control's flow: create any newly-named groups first,
    // refresh the /groups SWR cache so freshly-created entries are
    // resolvable in the table, then post the policy with all ids known.
    const calls = getSourceGroupsToUpdate().map((g) => g.promise());
    const created = (await Promise.all(calls).then((groups) => {
      mutate("/groups");
      return groups;
    })) as Group[];

    // Trim to the first group on save: handles the legacy >1 case
    // where the warning was shown but the operator hit Save without
    // editing the source field.
    const sourceGroupIds = sourceGroups
      .slice(0, 1)
      .map((g) => {
        if (g.id) return g.id;
        const match = created.find((c) => c.name === g.name);
        return match?.id;
      })
      .filter((id): id is string => Boolean(id));

    if (policy) {
      await updatePolicy(policy.id, {
        name,
        description,
        enabled,
        sourceGroups: sourceGroupIds,
        destinationProviderIds,
        guardrailIds,
        limits,
      });
    } else {
      await addPolicy({
        name,
        description,
        enabled,
        sourceGroups: sourceGroupIds,
        destinationProviderIds,
        guardrailIds,
        limits,
      });
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
                  <div
                    className={
                      "mt-2 text-xs text-yellow-400 leading-snug"
                    }
                  >
                    This policy was created with multiple source groups.
                    Only the first group is kept on save —{" "}
                    {sourceGroupsRaw[0]?.name ?? "—"} will be retained,
                    the others removed.
                  </div>
                )}
              </div>

              <div className={"w-full self-start"}>
                <Label className={"mb-2"}>
                  <Sparkles size={15} />
                  Provider
                  <HelpTooltip
                    content={
                      <>
                        AI providers the source is allowed to reach.
                      </>
                    }
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
            <InlineLink href={"https://docs.netbird.io/"} target={"_blank"}>
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
                    disabled={!canContinueFromPolicy || name.trim().length === 0}
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

  const toggleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

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
          {value.length === 0 ? (
            <span className={"pl-1"}>Select provider(s)...</span>
          ) : (
            value.map((id) => {
              const p = providers.find((pp) => pp.id === id);
              if (!p) return null;
              return (
                <Badge
                  key={id}
                  variant={"gray-ghost"}
                  className={"py-[3px] whitespace-nowrap"}
                  useHover
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleRemove(id);
                  }}
                >
                  <AIProviderLogo providerId={p.providerId} size={12} />
                  {p.name}
                  <X
                    size={12}
                    className={
                      "cursor-pointer group-hover:text-nb-gray-100 transition-all shrink-0"
                    }
                  />
                </Badge>
              );
            })
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
            "absolute z-50 mt-1 w-full bg-nb-gray-950 border border-nb-gray-800 rounded-md shadow-lg max-h-[280px] overflow-y-auto p-1"
          }
        >
          {providers.length === 0 ? (
            <div className={"text-xs text-nb-gray-400 px-3 py-3"}>
              No providers connected yet.
            </div>
          ) : (
            providers.map((p) => {
              const checked = value.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
                    checked
                      ? "bg-netbird/10"
                      : "hover:bg-nb-gray-900/50",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(p.id)}
                  />
                  <AIProviderLogo providerId={p.providerId} size={18} />
                  <div className={"flex-1 min-w-0"}>
                    <div className={"text-sm text-white truncate"}>
                      {p.name}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

