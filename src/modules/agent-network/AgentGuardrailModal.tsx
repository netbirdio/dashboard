"use client";

import Button from "@components/Button";
import { Checkbox } from "@components/Checkbox";
import HelpText from "@components/HelpText";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import { cn } from "@utils/helpers";
import {
  Boxes,
  ExternalLinkIcon,
  LayoutList,
  ShieldCheckIcon,
  ShieldHalf,
  Text,
} from "lucide-react";
import { useMemo, useState } from "react";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  AgentGuardrail,
  AgentGuardrailChecks,
  AIProviderId,
  EMPTY_GUARDRAIL_CHECKS,
} from "@/modules/agent-network/data/mockData";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardrail?: AgentGuardrail;
  onSuccess?: (g: AgentGuardrail) => void;
  // providerIds restricts the Model Allowlist options to the models
  // configured on these providers. Set when the modal is opened from
  // a policy where destination providers have been selected.
  providerIds?: string[];
};

export default function AgentGuardrailModal({
  open,
  onOpenChange,
  guardrail,
  onSuccess,
  providerIds,
}: Readonly<Props>) {
  const { addGuardrail, updateGuardrail } = useAIProviders();

  const [tab, setTab] = useState("checks");
  const [name, setName] = useState(guardrail?.name ?? "");
  const [description, setDescription] = useState(guardrail?.description ?? "");
  const [checks, setChecks] = useState<AgentGuardrailChecks>(
    guardrail?.checks ?? EMPTY_GUARDRAIL_CHECKS,
  );

  const atLeastOneEnabled =
    checks.model_allowlist.enabled || checks.prompt_capture.enabled;

  const canSubmit = name.trim().length > 0 && atLeastOneEnabled;

  const handleSubmit = async () => {
    const payload = {
      name: name.trim(),
      description: description.trim(),
      checks,
    };
    let saved: AgentGuardrail | undefined;
    if (guardrail) {
      await updateGuardrail(guardrail.id, payload);
      saved = { id: guardrail.id, ...payload };
    } else {
      saved = await addGuardrail(payload);
    }
    if (saved) onSuccess?.(saved);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-2xl")}
        showClose={true}
      >
        <ModalHeader
          icon={<ShieldHalf size={19} />}
          title={guardrail ? "Update Guardrail" : "Create Guardrail"}
          description={
            "Define a reusable set of LLM guardrails to attach to one or more policies."
          }
          color={"netbird"}
        />

        <Tabs onValueChange={setTab} defaultValue={tab} value={tab}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"checks"}>
              <LayoutList size={16} />
              Checks
            </TabsTrigger>
            <TabsTrigger value={"general"} disabled={!atLeastOneEnabled}>
              <Text
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Name & Description
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"checks"} className={"pb-6 px-8"}>
            <ModelAllowlistCheck
              providerIds={providerIds}
              value={
                checks.model_allowlist.enabled
                  ? checks.model_allowlist.models
                  : undefined
              }
              onChange={(models) =>
                setChecks((c) => ({
                  ...c,
                  model_allowlist: models
                    ? { enabled: true, models }
                    : { enabled: false, models: [] },
                }))
              }
            />
            <PromptCaptureCheck
              value={checks.prompt_capture.enabled}
              onChange={(enabled) =>
                setChecks((c) => ({
                  ...c,
                  prompt_capture: enabled
                    ? { enabled: true, redactPii: true }
                    : { ...c.prompt_capture, enabled: false },
                }))
              }
            />
          </TabsContent>

          <TabsContent value={"general"} className={"pb-8 px-8"}>
            <div className={"flex flex-col gap-6"}>
              <div>
                <Label>Name of the Guardrail</Label>
                <HelpText>
                  Set an easily identifiable name for this guardrail set.
                </HelpText>
                <Input
                  autoFocus={true}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"e.g., Strict — Production"}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <HelpText>
                  Write a short description to add more context to this
                  guardrail.
                </HelpText>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    "e.g., Tight model allowlist, PII redaction, hard monthly budget."
                  }
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
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
            {tab === "checks" && (
              <Button variant={"secondary"} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            {tab === "general" && (
              <Button variant={"secondary"} onClick={() => setTab("checks")}>
                Back
              </Button>
            )}
            {!guardrail && tab === "checks" && (
              <Button
                variant={"primary"}
                onClick={() => setTab("general")}
                disabled={!atLeastOneEnabled}
              >
                Continue
              </Button>
            )}
            {((!guardrail && tab === "general") || guardrail) && (
              <Button
                variant={"primary"}
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {guardrail ? "Save Changes" : "Create Guardrail"}
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ModelAllowlistCheck({
  value,
  onChange,
  providerIds,
}: {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  providerIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      active={Boolean(value && value.length > 0)}
      title={"Model Allowlist"}
      description={"Block requests for models not on the allowlist."}
      // The tile is a cream gradient, so the mark on it has to be dark.
      icon={<Boxes size={16} className={"text-netbird-950"} />}
      iconClass={"bg-gradient-to-tr from-netbird-200 to-netbird-100"}
      modalWidthClass={"max-w-2xl"}
      onReset={() => onChange(undefined)}
    >
      <ModelAllowlistContent
        value={value}
        providerIds={providerIds}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </PostureCheckCard>
  );
}

function ModelAllowlistContent({
  value,
  onChange,
  providerIds,
}: {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  providerIds?: string[];
}) {
  const [draft, setDraft] = useState<string[]>(value ?? []);
  const { providers } = useAIProviders();
  // When opened from a policy with destination providers selected,
  // restrict the allowlist options to models exposed by those
  // providers. Outside that context (e.g. the standalone Guardrails
  // page), fall back to every provider in the account.
  const scopedProviders = useMemo(() => {
    if (!providerIds || providerIds.length === 0) return providers;
    const ids = new Set(providerIds);
    return providers.filter((p) => ids.has(p.id));
  }, [providers, providerIds]);
  // Same model id across providers is collapsed into one row, with all
  // referencing provider names listed underneath.
  const providerModels = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; providerNames: string[]; catalogId: AIProviderId }
    >();
    for (const p of scopedProviders) {
      for (const m of p.models) {
        if (!m.id) continue;
        const entry = byId.get(m.id);
        if (entry) {
          if (!entry.providerNames.includes(p.name)) {
            entry.providerNames.push(p.name);
          }
        } else {
          // The mark is the first provider's; a model served by several is
          // one row, and its names are listed under it either way.
          byId.set(m.id, {
            id: m.id,
            providerNames: [p.name],
            catalogId: p.providerId,
          });
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [scopedProviders]);

  const toggle = (id: string) =>
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const allChecked =
    providerModels.length > 0 && draft.length === providerModels.length;
  const someChecked = draft.length > 0 && !allChecked;

  return (
    <>
      <div className={"flex flex-col px-8 gap-2 pt-2 pb-6"}>
        {providerModels.length === 0 ? (
          <Paragraph className={"!text-xs"}>
            {providerIds && providerIds.length > 0
              ? "The selected providers don't expose any models yet. Add models to a destination provider first — the allowlist is restricted to what those providers expose."
              : "No models configured on any provider yet. Add models to a provider first — the allowlist is restricted to what the providers actually expose."}
          </Paragraph>
        ) : (
          // Same table the network resource modal gives its policies.
          <div
            className={
              "border border-nb-gray-900 bg-nb-gray-920/30 py-1 px-1 rounded-md max-h-[360px] overflow-y-auto"
            }
          >
            <table className={"w-full"}>
              <thead>
                <tr>
                  <th className={"py-2 pl-4 pr-2 w-[20px]"}>
                    <Checkbox
                      checked={
                        allChecked
                          ? true
                          : someChecked
                          ? "indeterminate"
                          : false
                      }
                      aria-label={"Select all models"}
                      onCheckedChange={() =>
                        setDraft(
                          allChecked ? [] : providerModels.map((m) => m.id),
                        )
                      }
                    />
                  </th>
                  <th
                    className={
                      "py-2 px-4 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium"
                    }
                  >
                    Model
                  </th>
                  <th
                    className={
                      "py-2 px-4 text-left text-[11px] uppercase tracking-wider text-nb-gray-400 font-medium"
                    }
                  >
                    Provider
                  </th>
                </tr>
              </thead>
              <tbody>
                {providerModels.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={
                      "rounded-md hover:bg-nb-gray-900/30 cursor-pointer transition-all"
                    }
                  >
                    <td className={"py-2.5 pl-4 pr-2 align-middle w-[20px]"}>
                      <Checkbox checked={draft.includes(m.id)} />
                    </td>
                    <td className={"py-2.5 px-4 align-middle"}>
                      <code className={"text-[13px] text-nb-gray-100"}>
                        {m.id}
                      </code>
                    </td>
                    <td
                      className={
                        "py-2.5 px-4 align-middle whitespace-nowrap text-[13px] text-nb-gray-300"
                      }
                    >
                      <div className={"flex items-center gap-2.5"}>
                        <AIProviderLogo providerId={m.catalogId} size={14} />
                        {m.providerNames.join(" · ")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/agent-network/policies/guardrails#model-allowlist"
              }
              target={"_blank"}
            >
              Model Allowlist
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            disabled={draft.length === 0}
            onClick={() => onChange(draft.length === 0 ? undefined : draft)}
          >
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
}

function PromptCaptureCheck({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      active={value}
      title={"Prompt Capture"}
      description={"Redact PII before storing the prompt body."}
      icon={<ShieldCheckIcon size={16} />}
      iconClass={"bg-gradient-to-tr from-blue-500 to-blue-400"}
      modalWidthClass={"max-w-lg"}
      onReset={() => onChange(false)}
    >
      <PromptCaptureContent
        onConfirm={() => {
          onChange(true);
          setOpen(false);
        }}
      />
    </PostureCheckCard>
  );
}

function PromptCaptureContent({ onConfirm }: { onConfirm: () => void }) {
  return (
    <>
      <div className={"flex flex-col px-8 gap-3 pb-6"}>
        <div className={"text-sm text-nb-gray-300"}>
          NetBird redacts emails, SSN-shaped, phone-shaped, and credit-card
          patterns before storing the prompt body. Enabling this guardrail adds
          strict redaction on top of the proxy&apos;s built-in token redaction.
        </div>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/agent-network/policies/guardrails#prompt-capture"
              }
              target={"_blank"}
            >
              Prompt Capture
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button variant={"primary"} onClick={onConfirm}>
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
}
