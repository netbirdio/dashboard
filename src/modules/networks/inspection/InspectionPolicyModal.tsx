"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { Textarea } from "@components/Textarea";
import { useApiCall } from "@utils/api";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Edit,
  MinusCircleIcon,
  MoreVertical,
  Plus,
  Power,
  ShieldCheck,
  X,
} from "lucide-react";
import yaml from "js-yaml";
import * as React from "react";
import { KeyboardEvent, useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import {
  InspectionAction,
  InspectionPolicy,
  InspectionPolicyRule,
  InspectionProtocol,
} from "@/interfaces/Network";

type Props = {
  policy?: InspectionPolicy;
  onClose: () => void;
};

const ALL_PROTOCOLS: {
  value: InspectionProtocol;
  label: string;
  hint?: string;
}[] = [
  { value: "http", label: "HTTP" },
  { value: "https", label: "HTTPS" },
  { value: "h2", label: "H2" },
  { value: "h3", label: "H3" },
  { value: "websocket", label: "WS" },
  { value: "other", label: "Other", hint: "Non-HTTP/TLS" },
];

const ACTION_COLORS: Record<
  InspectionAction,
  { bg: string; border: string; text: string; variant: "green" | "red" | "yellow" }
> = {
  allow: {
    bg: "bg-green-500/10",
    border: "border-green-500",
    text: "text-green-400",
    variant: "green",
  },
  block: {
    bg: "bg-red-500/10",
    border: "border-red-500",
    text: "text-red-400",
    variant: "red",
  },
  inspect: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500",
    text: "text-yellow-400",
    variant: "yellow",
  },
};

export const InspectionPolicyModal = ({ policy, onClose }: Props) => {
  const { mutate } = useSWRConfig();
  const isEdit = !!policy?.id;

  const [name, setName] = useState(policy?.name ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  const [enabled, setEnabled] = useState(policy?.enabled ?? true);
  const [mode, setMode] = useState<"builtin" | "envoy" | "external">(
    policy?.mode ?? "builtin",
  );
  const [externalUrl, setExternalUrl] = useState(policy?.external_url ?? "");
  const [envoyBinaryPath, setEnvoyBinaryPath] = useState(policy?.envoy_binary_path ?? "");
  const [envoyAdminPort, setEnvoyAdminPort] = useState(policy?.envoy_admin_port?.toString() ?? "");
  const [envoyHttpFilters, setEnvoyHttpFilters] = useState(policy?.envoy_snippets?.http_filters ?? "");
  const [envoyClusters, setEnvoyClusters] = useState(policy?.envoy_snippets?.clusters ?? "");
  const [envoyNetworkFilters, setEnvoyNetworkFilters] = useState(policy?.envoy_snippets?.network_filters ?? "");
  const [defaultAction, setDefaultAction] = useState<InspectionAction>(
    policy?.default_action ?? "allow",
  );
  const [redirectPortsStr, setRedirectPortsStr] = useState(
    policy?.redirect_ports?.join(", ") ?? "",
  );
  const [rules, setRules] = useState<InspectionPolicyRule[]>(
    policy?.rules ?? [],
  );
  const [showAdvanced, setShowAdvanced] = useState(
    !!(policy?.ca_cert_pem || policy?.icap),
  );
  const [caCertPem, setCaCertPem] = useState(policy?.ca_cert_pem ?? "");
  const [caKeyPem, setCaKeyPem] = useState(policy?.ca_key_pem ?? "");
  const [icapReqmod, setIcapReqmod] = useState(
    policy?.icap?.reqmod_url ?? "",
  );
  const [icapRespmod, setIcapRespmod] = useState(
    policy?.icap?.respmod_url ?? "",
  );

  // Rule editing modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);

  const createApi = useApiCall<InspectionPolicy>("/inspection-policies").post;
  const updateApi = useApiCall<InspectionPolicy>(
    `/inspection-policies/${policy?.id}`,
  ).put;

  const addRule = () => {
    setEditingRuleIndex(null);
    setRuleModalOpen(true);
  };

  const editRule = (index: number) => {
    setEditingRuleIndex(index);
    setRuleModalOpen(true);
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules.map((r, i) => ({ ...r, priority: i + 1 })));
  };

  const moveRule = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === rules.length - 1)
    )
      return;
    const newRules = [...rules];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    [newRules[index], newRules[swapIdx]] = [newRules[swapIdx], newRules[index]];
    setRules(newRules.map((r, i) => ({ ...r, priority: i + 1 })));
  };

  const saveRule = (rule: InspectionPolicyRule) => {
    if (editingRuleIndex !== null) {
      setRules(
        rules.map((r, i) => (i === editingRuleIndex ? rule : r)),
      );
    } else {
      setRules([...rules, { ...rule, priority: rules.length + 1 }]);
    }
    setRuleModalOpen(false);
    setEditingRuleIndex(null);
  };

  const parseRedirectPorts = (): number[] | undefined => {
    if (!redirectPortsStr.trim()) return undefined;
    const parsed = redirectPortsStr
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0 && n <= 65535);
    return parsed.length > 0 ? parsed : undefined;
  };

  const [snippetErrors, setSnippetErrors] = useState<Record<string, string>>({});

  const validateYamlSnippet = (value: string, field: string): boolean => {
    if (!value.trim()) return true;
    try {
      yaml.load(value);
      setSnippetErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid YAML";
      setSnippetErrors((prev) => ({ ...prev, [field]: msg }));
      return false;
    }
  };

  const handleSubmit = async () => {
    // Validate all YAML snippets before submitting.
    if (mode === "envoy") {
      const fields: [string, string][] = [
        [envoyHttpFilters, "http_filters"],
        [envoyClusters, "clusters"],
        [envoyNetworkFilters, "network_filters"],
      ];
      let hasError = false;
      for (const [value, field] of fields) {
        if (!validateYamlSnippet(value, field)) hasError = true;
      }
      if (hasError) return;
    }

    const payload: InspectionPolicy = {
      name,
      description: description || undefined,
      enabled,
      mode,
      default_action: defaultAction,
      redirect_ports: parseRedirectPorts(),
      rules,
      external_url: mode === "external" ? externalUrl || undefined : undefined,
      envoy_binary_path: mode === "envoy" ? envoyBinaryPath || undefined : undefined,
      envoy_admin_port: mode === "envoy" && envoyAdminPort ? parseInt(envoyAdminPort) : undefined,
      envoy_snippets: mode === "envoy" && (envoyHttpFilters || envoyNetworkFilters || envoyClusters)
        ? {
            http_filters: envoyHttpFilters || undefined,
            network_filters: envoyNetworkFilters || undefined,
            clusters: envoyClusters || undefined,
          }
        : undefined,
      ca_cert_pem: caCertPem || undefined,
      ca_key_pem: caKeyPem || undefined,
      icap:
        icapReqmod || icapRespmod
          ? {
              reqmod_url: icapReqmod || undefined,
              respmod_url: icapRespmod || undefined,
            }
          : undefined,
    };

    const fn = isEdit ? updateApi : createApi;

    notify({
      title: "Inspection Policy",
      description: isEdit ? "Policy updated" : "Policy created",
      loadingMessage: isEdit ? "Updating..." : "Creating...",
      promise: fn(payload).then(() => {
        mutate("/inspection-policies");
        onClose();
      }),
    });
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent maxWidthClass="max-w-xl">
        <ModalHeader
          icon={<ShieldCheck size={20} />}
          title={isEdit ? "Edit Inspection Policy" : "New Inspection Policy"}
          description="Define rules for transparent proxy traffic inspection."
          color="netbird"
        />

        <div className="px-8 flex flex-col gap-6 py-6 max-h-[65vh] overflow-y-auto">
          {/* Name */}
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Corporate web filtering"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Mode switch */}
          <div>
            <Label>Proxy Mode</Label>
            <HelpText>
              Built-in: Go-native inspection. Envoy: local envoy sidecar with
              full L7 features. External: forward to a remote proxy.
            </HelpText>
            <div className="flex gap-2 mt-1">
              {(["builtin", "envoy", "external"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    mode === m
                      ? "bg-netbird/10 border-netbird/50 text-netbird"
                      : "border-nb-gray-700 text-nb-gray-400 hover:border-nb-gray-500"
                  }`}
                >
                  {m === "builtin"
                    ? "Built-in"
                    : m === "envoy"
                      ? "Envoy"
                      : "External Proxy"}
                </button>
              ))}
            </div>
          </div>

          {/* External URL (only when external mode) */}
          {mode === "external" && (
            <div>
              <Label>External Proxy URL</Label>
              <HelpText>
                http://proxy:3128 for HTTP CONNECT, socks5://proxy:1080 for
                SOCKS5, or https://proxy:443 for TLS-wrapped CONNECT.
              </HelpText>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="http://proxy.corp.com:3128"
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Envoy settings (only when envoy mode) */}
          {mode === "envoy" && (
            <div className="flex flex-col gap-4">
              <div>
                <Label>Envoy Binary Path</Label>
                <HelpText>
                  Path to the envoy binary. Leave empty to search $PATH.
                </HelpText>
                <Input
                  value={envoyBinaryPath}
                  onChange={(e) => setEnvoyBinaryPath(e.target.value)}
                  placeholder="/usr/bin/envoy (empty = $PATH)"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label>Admin Port</Label>
                <HelpText>
                  Port for envoy admin API (health checks, stats). Empty for
                  auto-assign.
                </HelpText>
                <Input
                  value={envoyAdminPort}
                  onChange={(e) => setEnvoyAdminPort(e.target.value)}
                  placeholder="0 (auto)"
                  className="font-mono text-xs w-32"
                />
              </div>
              <div>
                <Label>Config Snippets</Label>
                <HelpText>
                  YAML fragments merged into the generated envoy config. Use
                  these to add custom filters, clusters, or listeners.
                </HelpText>
                <div className="flex flex-col gap-3 mt-2">
                  {([
                    { label: "HTTP Filters", field: "http_filters", value: envoyHttpFilters, setter: setEnvoyHttpFilters, placeholder: "- name: envoy.filters.http.ext_authz\n  typed_config: ...", rows: 3 },
                    { label: "Clusters", field: "clusters", value: envoyClusters, setter: setEnvoyClusters, placeholder: "- name: my_service\n  type: STRICT_DNS\n  ...", rows: 3 },
                    { label: "Network Filters (L4)", field: "network_filters", value: envoyNetworkFilters, setter: setEnvoyNetworkFilters, placeholder: "- name: envoy.filters.network.rbac\n  typed_config: ...", rows: 3 },
                  ] as const).map(({ label, field, value, setter, placeholder, rows }) => (
                    <div key={field}>
                      <label className="text-xs text-nb-gray-400 mb-1 block">
                        {label}
                      </label>
                      <textarea
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        onBlur={() => validateYamlSnippet(value, field)}
                        placeholder={placeholder}
                        className={`w-full bg-nb-gray-920 border rounded-md p-2 font-mono text-xs text-nb-gray-300 min-h-[${rows === 3 ? "80" : "60"}px] resize-y ${
                          snippetErrors[field]
                            ? "border-red-500/50"
                            : "border-nb-gray-800"
                        }`}
                        rows={rows}
                      />
                      {snippetErrors[field] && (
                        <p className="text-red-400 text-[.7rem] mt-1 font-mono">
                          {snippetErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Redirect Ports (applies to all modes - L4 interception) */}
          <div>
            <Label>Redirect Ports</Label>
            <HelpText>
              Which destination ports to intercept at L4. Leave empty for all
              ports.
            </HelpText>
            <Input
              value={redirectPortsStr}
              onChange={(e) => setRedirectPortsStr(e.target.value)}
              placeholder="80, 443 (empty = all)"
              className="font-mono text-xs"
            />
          </div>

          {/* Builtin/Envoy mode settings (rules, default action, TLS, ICAP) */}
          {(mode === "builtin" || mode === "envoy") && (
          <>
          {/* Default Action */}
          <div>
            <Label>Default Action</Label>
            <HelpText>
              Applied to recognized traffic (HTTP/TLS) when no rule matches.
              Unrecognized protocols are dropped unless a rule explicitly allows
              &quot;Other&quot;.
            </HelpText>
            <div className="flex gap-2 mt-1">
              {(["allow", "block", "inspect"] as InspectionAction[]).map(
                (a) => {
                  const colors = ACTION_COLORS[a];
                  const isSelected = defaultAction === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setDefaultAction(a)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        isSelected
                          ? `${colors.bg} ${colors.border} ${colors.text}`
                          : "border-nb-gray-700 text-nb-gray-400 hover:border-nb-gray-500"
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Advanced: CA + ICAP */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-nb-gray-400 hover:text-nb-gray-200 transition-colors
                         flex items-center gap-1"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${showAdvanced ? "rotate-0" : "-rotate-90"}`}
              />
              Advanced Settings
              {(caCertPem || icapReqmod || icapRespmod) && (
                <span className="text-netbird text-[10px] ml-1">configured</span>
              )}
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-4 mt-3 pl-4 border-l border-nb-gray-800">
                {/* CA Certificate */}
                <div>
                  <Label>MITM CA Certificate (PEM)</Label>
                  <HelpText>
                    Required for TLS inspection. Traffic will be decrypted and
                    re-encrypted with dynamic certificates.
                  </HelpText>
                  <Textarea
                    value={caCertPem}
                    onChange={(e) => setCaCertPem(e.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----"
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>

                {/* CA Key */}
                <div>
                  <Label>MITM CA Private Key (PEM)</Label>
                  <Textarea
                    value={caKeyPem}
                    onChange={(e) => setCaKeyPem(e.target.value)}
                    placeholder="-----BEGIN EC PRIVATE KEY-----"
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>

                {/* ICAP */}
                <div>
                  <Label>ICAP REQMOD URL</Label>
                  <HelpText>
                    ICAP service URL for request modification (content scanning).
                  </HelpText>
                  <Input
                    value={icapReqmod}
                    onChange={(e) => setIcapReqmod(e.target.value)}
                    placeholder="icap://icap-server:1344/reqmod"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>ICAP RESPMOD URL</Label>
                  <Input
                    value={icapRespmod}
                    onChange={(e) => setIcapRespmod(e.target.value)}
                    placeholder="icap://icap-server:1344/respmod"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rules */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <div>
                <Label className="mb-0">Rules</Label>
                <HelpText className="mb-0">
                  {rules.length} rule{rules.length !== 1 ? "s" : ""}. Evaluated
                  in priority order (top to bottom).
                </HelpText>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {rules.length > 0 && (
                <div
                  className="rounded-md overflow-hidden border border-nb-gray-900
                             bg-nb-gray-920/30 py-1 px-1"
                >
                  {rules.map((rule, idx) => (
                    <RuleSummaryRow
                      key={idx}
                      rule={rule}
                      index={idx}
                      totalRules={rules.length}
                      onEdit={() => editRule(idx)}
                      onRemove={() => removeRule(idx)}
                      onMove={(dir) => moveRule(idx, dir)}
                    />
                  ))}
                </div>
              )}

              {/* Add rule button */}
              <button
                onClick={addRule}
                className="flex items-center justify-center gap-2 py-3 rounded-md
                           border border-dashed border-nb-gray-700 text-nb-gray-400
                           hover:border-nb-gray-500 hover:text-nb-gray-300
                           transition-colors text-sm mt-1"
              >
                <Plus size={14} />
                Add Rule
              </button>
            </div>
          </div>
          </>
          )}

          {/* Enabled toggle */}
          <FancyToggleSwitch
            value={enabled}
            onChange={setEnabled}
            label={
              <>
                <Power size={15} />
                Enable Policy
              </>
            }
            helpText="Use this switch to enable or disable this inspection policy."
          />
        </div>

        <ModalFooter className="items-center" separator={true}>
          <div className="flex gap-3 justify-end w-full">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button
              variant="primary"
              size="sm"
              disabled={!name}
              onClick={handleSubmit}
            >
              {isEdit ? "Save Policy" : "Create Policy"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>

      {/* Rule editing sub-modal */}
      {ruleModalOpen && (
        <RuleEditModal
          rule={editingRuleIndex !== null ? rules[editingRuleIndex] : undefined}
          onSave={saveRule}
          onClose={() => {
            setRuleModalOpen(false);
            setEditingRuleIndex(null);
          }}
        />
      )}
    </Modal>
  );
};

// Rule summary row in the list
function RuleSummaryRow({
  rule,
  index,
  totalRules,
  onEdit,
  onRemove,
  onMove,
}: {
  rule: InspectionPolicyRule;
  index: number;
  totalRules: number;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const actionColors = ACTION_COLORS[rule.action];
  const domains = rule.domains ?? [];
  const protocols = rule.protocols ?? [];

  return (
    <div
      className="flex justify-between py-2.5 items-center hover:bg-nb-gray-900/30
                 rounded-md cursor-pointer px-4 transition-all"
      onClick={onEdit}
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <Badge variant="gray" className="text-[10px] font-mono shrink-0">
          #{rule.priority}
        </Badge>
        <Badge variant={actionColors.variant} className="text-xs capitalize shrink-0">
          {rule.action}
        </Badge>
        <div className="flex flex-wrap gap-1 min-w-0">
          {domains.length > 0 ? (
            <>
              {domains.slice(0, 3).map((d) => (
                <Badge
                  key={d}
                  variant="gray"
                  className="text-[10px] font-mono"
                >
                  {d}
                </Badge>
              ))}
              {domains.length > 3 && (
                <span className="text-[10px] text-nb-gray-500">
                  +{domains.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-nb-gray-500 italic">all domains</span>
          )}
        </div>
        {protocols.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {protocols.map((p) => (
              <span
                key={p}
                className="text-[10px] font-mono text-netbird/70 bg-netbird/10
                           px-1.5 py-0.5 rounded"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        className="flex gap-1 items-center shrink-0 ml-3"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="default-outline" className="!px-2 !py-1">
              <MoreVertical size={14} className="shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto min-w-[180px]" align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit size={14} className="shrink-0" />
              Edit Rule
            </DropdownMenuItem>
            {index > 0 && (
              <DropdownMenuItem onClick={() => onMove("up")}>
                <ArrowUp size={14} className="shrink-0" />
                Move Up
              </DropdownMenuItem>
            )}
            {index < totalRules - 1 && (
              <DropdownMenuItem onClick={() => onMove("down")}>
                <ArrowDown size={14} className="shrink-0" />
                Move Down
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onRemove}
              className="text-red-500"
            >
              <MinusCircleIcon size={14} className="shrink-0" />
              Remove Rule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Rule editing sub-modal
function RuleEditModal({
  rule,
  onSave,
  onClose,
}: {
  rule?: InspectionPolicyRule;
  onSave: (rule: InspectionPolicyRule) => void;
  onClose: () => void;
}) {
  const isEdit = !!rule;
  const [action, setAction] = useState<InspectionAction>(
    rule?.action ?? "block",
  );
  const [domains, setDomains] = useState<string[]>(rule?.domains ?? []);
  const [paths, setPaths] = useState<string[]>(rule?.paths ?? []);
  const [networks, setNetworks] = useState<string[]>(rule?.networks ?? []);
  // Default new rules to HTTP/HTTPS/H2/WebSocket. Exclude H3 (can't inspect)
  // and Other (non-HTTP passthrough) unless explicitly enabled.
  const defaultProtocols: InspectionProtocol[] = [
    "http",
    "https",
    "h2",
    "websocket",
  ];
  const [protocols, setProtocols] = useState<InspectionProtocol[]>(
    rule?.protocols ?? defaultProtocols,
  );
  const [priority, setPriority] = useState(rule?.priority ?? 1);

  const handleSave = () => {
    onSave({
      action,
      domains: domains.length > 0 ? domains : undefined,
      paths: paths.length > 0 ? paths : undefined,
      networks: networks.length > 0 ? networks : undefined,
      protocols: protocols.length > 0 ? protocols : undefined,
      priority,
    });
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent maxWidthClass="max-w-md">
        <ModalHeader
          icon={<ShieldCheck size={18} />}
          title={isEdit ? "Edit Rule" : "Add Rule"}
          description="Configure what happens when traffic matches this rule."
          color="netbird"
        />

        <div className="px-8 flex flex-col gap-5 py-6 max-h-[65vh] overflow-y-auto">
          {/* Action */}
          <div>
            <Label>Action</Label>
            <HelpText>What to do when traffic matches this rule.</HelpText>
            <div className="flex gap-2 mt-1">
              {(["allow", "block", "inspect"] as InspectionAction[]).map(
                (a) => {
                  const colors = ACTION_COLORS[a];
                  const isSelected = action === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setAction(a)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        isSelected
                          ? `${colors.bg} ${colors.border} ${colors.text}`
                          : "border-nb-gray-700 text-nb-gray-400 hover:border-nb-gray-500"
                      }`}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Domains */}
          <div>
            <Label>Domains</Label>
            <HelpText>
              Domain patterns to match. Supports wildcards (*.example.com).
              Leave empty to match all.
            </HelpText>
            <DomainTagInput domains={domains} onChange={setDomains} />
          </div>

          {/* URL Paths */}
          <div>
            <Label>URL Paths</Label>
            <HelpText>
              Path patterns to match. Exact: /login, prefix: /api/*, contains:
              */admin/*. HTTPS paths require inspect action (MITM). Leave empty
              for all paths.
            </HelpText>
            <DomainTagInput domains={paths} onChange={setPaths} />
          </div>

          {/* Destination Networks */}
          <div>
            <Label>Destination Networks</Label>
            <HelpText>
              CIDR ranges to match (e.g. 10.0.0.0/8). Leave empty for any
              destination.
            </HelpText>
            <DomainTagInput domains={networks} onChange={setNetworks} />
          </div>

          {/* Protocols */}
          <div>
            <Label>Protocols</Label>
            <HelpText>
              Match specific application protocols. &quot;Other&quot; matches
              non-HTTP/TLS traffic. Unmatched protocols are dropped.
            </HelpText>
            <ProtocolToggles selected={protocols} onChange={setProtocols} />
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <HelpText>Lower numbers are evaluated first.</HelpText>
            <Input
              type="number"
              value={String(priority)}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              min={1}
              className="w-24"
            />
          </div>
        </div>

        <ModalFooter className="items-center" separator={true}>
          <div className="flex gap-3 justify-end w-full">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              {isEdit ? "Save Rule" : "Add Rule"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Tag input for domains
function DomainTagInput({
  domains,
  onChange,
}: {
  domains: string[];
  onChange: (domains: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const addDomain = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !domains.includes(trimmed)) {
        onChange([...domains, trimmed]);
      }
      setInputValue("");
    },
    [domains, onChange],
  );

  const removeDomain = (domain: string) => {
    onChange(domains.filter((d) => d !== domain));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addDomain(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && domains.length > 0) {
      removeDomain(domains[domains.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addDomain(inputValue);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 min-h-[36px] px-2.5 py-2
                  rounded-md border border-nb-gray-800 bg-nb-gray-930
                  focus-within:border-nb-gray-600 transition-colors"
    >
      {domains.map((domain) => (
        <span
          key={domain}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded
                     bg-nb-gray-800 text-nb-gray-200 text-xs font-mono"
        >
          {domain}
          <button
            onClick={() => removeDomain(domain)}
            className="text-nb-gray-500 hover:text-nb-gray-200 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={
          domains.length === 0 ? "*.example.com, malware.org..." : ""
        }
        className="flex-1 min-w-[120px] bg-transparent text-xs text-nb-gray-200
                   placeholder:text-nb-gray-600 outline-none border-none"
      />
    </div>
  );
}

// Protocol toggles
function ProtocolToggles({
  selected,
  onChange,
}: {
  selected: InspectionProtocol[];
  onChange: (protocols: InspectionProtocol[]) => void;
}) {
  const toggle = (proto: InspectionProtocol) => {
    if (selected.includes(proto)) {
      onChange(selected.filter((p) => p !== proto));
    } else {
      onChange([...selected, proto]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {ALL_PROTOCOLS.map(({ value, label, hint }) => {
        const isActive = selected.includes(value);
        return (
          <button
            key={value}
            onClick={() => toggle(value)}
            title={hint}
            className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
              isActive
                ? "bg-netbird/10 border-netbird/50 text-netbird"
                : "border-nb-gray-800 text-nb-gray-500 hover:border-nb-gray-600 hover:text-nb-gray-400"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
