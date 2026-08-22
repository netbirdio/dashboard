"use client";

import Button from "@components/Button";
import { Callout } from "@components/Callout";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
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
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import {
  AlertCircleIcon,
  ArrowRightLeft,
  Boxes,
  ChevronRightIcon,
  ExternalLinkIcon,
  KeyRound,
  ListIcon,
  MinusCircleIcon,
  PlusCircle,
  PlusIcon,
  RefreshCwIcon,
  ShieldOffIcon,
  Sparkles,
  UploadIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AgentNetworkIcon from "@/assets/icons/AgentNetworkIcon";
import { useDialog } from "@/contexts/DialogProvider";
import {
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  AIProvider,
  AIProviderId,
  ProviderModel,
} from "@/modules/agent-network/data/mockData";
import { useDiscoveredModels } from "@/modules/agent-network/useDiscoveredModels";
import { useProviderCatalog } from "@/modules/agent-network/useProviderCatalog";

// EXTRA_HEADER_UI owns the dashboard copy for catalog-declared extra
// headers, keyed by ExtraHeader.name. Backend declares only the wire
// header name; everything an operator reads (input label, helper
// line, hover tooltip, placeholder) lives here so UI copy can be
// edited without touching the management API. New gateway header?
// Add a row keyed by the wire name and the modal picks it up.
type ExtraHeaderUI = {
  label: string;
  helpText?: string;
  tooltip?: React.ReactNode;
  placeholder?: string;
};
const EXTRA_HEADER_UI: Record<string, ExtraHeaderUI> = {
  "x-portkey-config": {
    label: "Portkey Config ID",
    helpText: "Saved Portkey config (pc-...).",
    tooltip:
      "Encapsulates upstream provider + virtual key on Portkey's hosted side. Stamped on every request as x-portkey-config: <id>. Leave blank if your callers author @org/model in the request body instead.",
    placeholder: "pc-...",
  },
  "HTTP-Referer": {
    label: "App URL",
    helpText: "Your app's URL — OpenRouter's primary app identifier.",
    tooltip:
      "Stamped on every request as HTTP-Referer. OpenRouter creates a per-app page from this URL and uses it as the primary identifier in their public rankings and per-app analytics. Leave blank to skip; requests still flow but won't attribute to any app on OpenRouter's side.",
    placeholder: "https://your-app.example",
  },
  "X-OpenRouter-Title": {
    label: "App display name",
    helpText: "Human-readable app name shown in OpenRouter's rankings.",
    tooltip:
      "Stamped on every request as X-OpenRouter-Title. Sets the display name of your app in OpenRouter's public rankings and analytics. Requires HTTP-Referer to be set too — without it, X-OpenRouter-Title is ignored.",
    placeholder: "Your App Name",
  },
};
// Fallback used when the catalog declares an extra header the
// dashboard doesn't have copy for yet — keeps the input usable
// instead of rendering an unlabeled box.
const fallbackExtraHeaderUI = (name: string): ExtraHeaderUI => ({
  label: name,
});

// upstreamUrlPlaceholder hints the per-provider URL shape so an
// operator who selects a gateway type sees the path suffix they're
// expected to include. Generic providers fall back to a shared
// example.
function upstreamUrlPlaceholder(providerId: AIProviderId): string {
  switch (providerId) {
    case "bifrost":
      return "https://your-bifrost-host/openai";
    case "cloudflare_ai_gateway":
      return "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai";
    case "vercel_ai_gateway":
      return "https://ai-gateway.vercel.sh";
    case "vertex_ai_api":
      return "https://aiplatform.googleapis.com";
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "litellm_proxy":
      return "https://your-litellm-host";
    case "portkey":
      return "https://api.portkey.ai";
    case "vllm":
      return "https://your-vllm-host:8000";
    case "kimi_api":
      return "https://api.moonshot.ai";
    case "custom":
      return "https://your-llm-host";
    default:
      return "https://api.openai.com";
  }
}

// upstreamUrlHelpText documents the per-provider URL convention.
// Bifrost in particular needs the integration-path suffix or the
// gateway returns 404; calling that out at the input keeps operators
// from pasting a bare hostname.
function upstreamUrlHelpText(providerId: AIProviderId): string {
  switch (providerId) {
    case "bifrost":
      return "Your Bifrost host. Optionally append a path like /openai for OpenAI-shaped apps or /anthropic for the native Anthropic Messages API so the prefix is built into the endpoint and your apps don't need to include it on every call.";
    case "cloudflare_ai_gateway":
      return "Your Cloudflare AI Gateway URL including the upstream provider slug (/openai, /anthropic, /workers-ai, …) so the proxy can dispatch to the correct parser. The /compat universal endpoint also works for OpenAI-shaped apps that route to multiple upstreams via the model prefix.";
    case "vercel_ai_gateway":
      return "Vercel AI Gateway uses a fixed endpoint; only the API key varies by operator. Apps choose the upstream provider with the model prefix, e.g. openai/gpt-5.4 or anthropic/claude-opus-4.6.";
    case "openrouter":
      return "OpenRouter uses a fixed endpoint, openrouter.ai/api/v1; apps choose the upstream provider via the model prefix, e.g. anthropic/claude-* or openai/gpt-*.";
    case "vllm":
      return "Your local vLLM server's OpenAI-compatible base URL.";
    default:
      return "Where NetBird forwards the traffic.";
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: AIProvider;
};

// ModelRowEditor owns row-local UI state (custom/catalog mode, expanded cache
// disclosure, in-progress price text). Keying the row list by array index would
// let that state stick to a position rather than a row, so removing or
// reordering a row would leak the removed row's state into its neighbour. Each
// row carries a stable client-only key instead. _key is never sent to the API —
// toAPIModels whitelists the wire fields.
type EditableModel = ProviderModel & { _key: string };

let modelKeySeq = 0;
// MASKED_API_KEY is what the edit form shows in place of a stored credential.
// The real key never reaches the browser, so anything equal to this is a
// placeholder rather than something that can be sent to a vendor.
const MASKED_API_KEY = "••••••••";

const withModelKey = (m: ProviderModel): EditableModel => ({
  ...m,
  _key: `model-${modelKeySeq++}`,
});

// hasNoPrice reports a row that would meter every request against it as free.
// Both rates, not either: a model priced on input alone is a deliberate
// configuration, while zero on both is the shape an unpriced model arrives in.
const hasNoPrice = (m: ProviderModel) => !m.inputPer1k && !m.outputPer1k;

// sortUnpricedFirst floats the rows needing a rate to the top, keeping the
// relative order within each half so the vendor's own ordering survives.
const sortUnpricedFirst = <T extends ProviderModel>(rows: T[]): T[] =>
  rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        Number(hasNoPrice(b.row)) - Number(hasNoPrice(a.row)) ||
        a.index - b.index,
    )
    .map(({ row }) => row);

export default function AIProviderModal({
  open,
  onOpenChange,
  provider,
}: Readonly<Props>) {
  const {
    addProvider,
    updateProvider,
    settings,
    bootstrapAgentNetworkSettings,
  } = useAIProviders();
  const { data: domains, isLoading: domainsLoading } = useFetchApi<
    ReverseProxyDomain[]
  >("/reverse-proxies/domains");
  const { catalog: catalogList, getById } = useProviderCatalog();
  const { confirm } = useDialog();

  const isEdit = !!provider;
  // The endpoint lives on the account-level Settings row, bootstrapped once
  // via an explicit POST. We auto-pick a proxy cluster from the live /domains
  // response and, when the account isn't bootstrapped yet, POST it as the
  // settings proxy_address right before the first provider create.
  const settingsBootstrapped = !!settings;

  const [tab, setTab] = useState<string>("provider");
  const [providerId, setProviderId] = useState<AIProviderId>(
    provider?.providerId ?? "openai_api",
  );
  const [name, setName] = useState(provider?.name ?? "OpenAI API");
  const [upstreamUrl, setUpstreamUrl] = useState<string>(
    provider?.upstreamUrl ?? "",
  );
  const [apiKey, setApiKey] = useState(isEdit ? MASKED_API_KEY : "");
  const [bootstrapCluster, setBootstrapCluster] = useState<string>("");
  const [models, setModels] = useState<EditableModel[]>(() =>
    (provider?.models ?? []).map(withModelKey),
  );
  const discovered = useDiscoveredModels();

  // Vertex AI authenticates with a service-account JSON key, not an API key.
  // We upload the file and store it base64-encoded in apiKey (the server
  // decodes the base64 JSON); keyFileName tracks the uploaded file for display.
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  const onJsonKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    // The server expects the JSON key prefixed with "keyfile::".
    setApiKey("keyfile::" + window.btoa(binary));
    setKeyFileName(file.name);
    // Clear so picking the same file again still fires onChange.
    e.target.value = "";
  };
  // extraValues holds operator-typed values for catalog-declared extra
  // headers (e.g. Portkey's x-portkey-config). Keyed by wire header
  // name. Catalog (catalog.extra_headers) decides which inputs render
  // and with what label.
  const [extraValues, setExtraValues] = useState<Record<string, string>>(
    provider?.extraValues ?? {},
  );
  // Operator-set wire header names for HeaderPair-style identity
  // injection on catalog entries that flag the shape as customizable
  // (Bifrost today). Empty string disables stamping for that
  // dimension. The catalog default is shown in the input as a
  // placeholder but only the value stored here lands on the wire.
  const [identityHeaderUserId, setIdentityHeaderUserId] = useState<string>(
    provider?.identityHeaderUserId ?? "",
  );
  const [identityHeaderGroups, setIdentityHeaderGroups] = useState<string>(
    provider?.identityHeaderGroups ?? "",
  );
  const [skipTlsVerification, setSkipTlsVerification] = useState<boolean>(
    provider?.skipTlsVerification ?? false,
  );
  const [metadataDisabled, setMetadataDisabled] = useState<boolean>(
    provider?.metadataDisabled ?? false,
  );

  const catalog = getById(providerId);
  // Custom-kind providers (the generic "Custom" entry and named self-hosted
  // ones like vLLM) share the self-hosted extras, e.g. Skip TLS verification.
  const isCustomKind = catalog?.kind === "custom";
  const customizableHeaderPair =
    catalog?.identity_injection?.header_pair?.customizable === true;
  const customizableJsonMetadata =
    catalog?.identity_injection?.json_metadata?.customizable === true;
  // Either-shape flag used to gate the override-aware branches —
  // submit-body inclusion, switch-away wipe, render of the Mappings
  // editor. The two shapes are mutually exclusive on a catalog
  // entry, so this never double-counts.
  const customizableIdentity =
    customizableHeaderPair || customizableJsonMetadata;
  // Defaults shown as input placeholders. The first non-empty source
  // wins; HeaderPair vs JSONMetadata are exclusive so either branch
  // is empty when the other is set.
  const identityDefaultUser =
    catalog?.identity_injection?.header_pair?.end_user_id_header ??
    catalog?.identity_injection?.json_metadata?.user_key ??
    "";
  const identityDefaultGroups =
    catalog?.identity_injection?.header_pair?.tags_header ??
    catalog?.identity_injection?.json_metadata?.groups_key ??
    "";
  // Wire header that carries the JSON metadata payload on the
  // JSONMetadata shape — used in the Mappings copy so operators see
  // which header is sent (e.g. cf-aig-metadata for Cloudflare). Empty
  // for HeaderPair shapes (which don't have one shared header).
  const jsonMetadataHeader =
    catalog?.identity_injection?.json_metadata?.header ?? "";

  // showMappings reveals the Mappings tab for provider types whose
  // downstream gateway keys identity off NetBird-stamped headers.
  // For non-customizable shapes (LiteLLM, Portkey) the mapping is
  // fixed in v1 — the tab is read-only. For customizable shapes
  // (Bifrost) the operator picks the wire header names, so the tab
  // renders editable inputs.
  const showMappings =
    providerId === "litellm_proxy" ||
    providerId === "portkey" ||
    providerId === "bifrost" ||
    providerId === "cloudflare_ai_gateway" ||
    providerId === "vercel_ai_gateway" ||
    providerId === "openrouter" ||
    providerId === "bedrock_api";

  // If the user flips provider type while viewing the Mappings tab and
  // the new type doesn't show mappings, snap back to the Provider tab
  // so the wizard doesn't render an empty tab content.
  React.useEffect(() => {
    if (!showMappings && tab === "mappings") {
      setTab("provider");
    }
  }, [showMappings, tab]);

  const validatedClusters = useMemo(
    () =>
      (domains ?? []).filter(
        (d) => d.type === ReverseProxyDomainType.FREE && d.validated,
      ),
    [domains],
  );
  const noClustersAvailable =
    !settingsBootstrapped && !domainsLoading && validatedClusters.length === 0;

  // Auto-pick the first validated cluster on first render once the
  // /domains response lands. Only matters for the first-create flow —
  // once settings is bootstrapped no further bootstrap happens.
  React.useEffect(() => {
    if (settingsBootstrapped) return;
    if (bootstrapCluster) return;
    if (validatedClusters.length === 0) return;
    setBootstrapCluster(validatedClusters[0].domain);
  }, [settingsBootstrapped, bootstrapCluster, validatedClusters]);

  // Seed the upstream URL from the catalog entry once it lands — the
  // catalog is fetched async, so on first render `getById("openai_api")`
  // is undefined and the URL field would otherwise stay empty.
  React.useEffect(() => {
    if (provider) return;
    if (upstreamUrl) return;
    if (!catalog) return;
    if (!catalog.default_host) return;
    // Vertex's catalog host is templated (<region>-…); skip the prefill so the
    // clean https://aiplatform.googleapis.com placeholder shows instead.
    if (catalog.id === "vertex_ai_api") return;
    setUpstreamUrl(`https://${catalog.default_host}`);
  }, [provider, upstreamUrl, catalog]);

  // Seed identity-label defaults when the catalog lands and the
  // current shape is customizable (HeaderPair OR JSONMetadata).
  // Same async-availability concern as the URL effect above. Only
  // fires for new providers (not edits) and only when the inputs
  // are empty so an operator's intentional clear isn't clobbered.
  React.useEffect(() => {
    if (provider) return;
    if (!customizableIdentity) return;
    if (!identityHeaderUserId && identityDefaultUser) {
      setIdentityHeaderUserId(identityDefaultUser);
    }
    if (!identityHeaderGroups && identityDefaultGroups) {
      setIdentityHeaderGroups(identityDefaultGroups);
    }
    // Intentionally exclude identityHeader* from the dep list — we
    // only want to seed on catalog arrival, not bounce back when
    // the operator clears a field. eslint disable kept narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, catalog]);

  const reset = () => {
    setTab("provider");
    if (isEdit && provider) {
      setProviderId(provider.providerId);
      setName(provider.name);
      setUpstreamUrl(provider.upstreamUrl);
      setApiKey(MASKED_API_KEY);
      setBootstrapCluster("");
      setModels(provider.models.map(withModelKey));
      setExtraValues(provider.extraValues ?? {});
      setIdentityHeaderUserId(provider.identityHeaderUserId ?? "");
      setIdentityHeaderGroups(provider.identityHeaderGroups ?? "");
      setSkipTlsVerification(provider.skipTlsVerification ?? false);
      setMetadataDisabled(provider.metadataDisabled ?? false);
    } else {
      const fallback = getById("openai_api");
      setProviderId("openai_api");
      setName(fallback ? fallback.name : "OpenAI API");
      setUpstreamUrl(
        fallback?.default_host ? `https://${fallback.default_host}` : "",
      );
      setApiKey("");
      setBootstrapCluster(
        settingsBootstrapped ? "" : validatedClusters[0]?.domain ?? "",
      );
      setModels([]);
      setExtraValues({});
      setIdentityHeaderUserId("");
      setIdentityHeaderGroups("");
      setSkipTlsVerification(false);
      setMetadataDisabled(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const canContinueFromProvider =
    !!providerId &&
    name.trim().length > 0 &&
    /^https?:\/\/[^\s]+$/i.test(upstreamUrl.trim()) &&
    apiKey.trim().length >= 4 &&
    // First-create bootstraps the settings row and needs a cluster pick;
    // once settings is bootstrapped no cluster is involved.
    (settingsBootstrapped || bootstrapCluster.trim().length > 0);

  // Restrict extraValues to keys the current catalog entry declares.
  // Avoids carrying stale keys forward when the operator switches
  // provider type or when a catalog entry drops a header.
  const sanitizedExtraValues = useMemo(() => {
    const declared = new Set((catalog?.extra_headers ?? []).map((h) => h.name));
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(extraValues)) {
      if (declared.has(k) && v.trim() !== "") out[k] = v.trim();
    }
    return out;
  }, [catalog?.extra_headers, extraValues]);

  const handleSubmit = async () => {
    if (!catalog) return;
    // Drop rows the operator never filled in (an added-but-empty custom
    // row, or the empty fallback row when the catalog is exhausted) —
    // the API rejects models without an id, which would fail the whole
    // save over a leftover blank line. Duplicate ids are collapsed to the
    // first row too: the catalog dropdown can't offer an id twice, but two
    // custom rows can be typed with the same id, and shipping both would
    // send an ambiguous price for the model.
    const seenModelIds = new Set<string>();
    const submittedModels = models
      .map((m) => ({ ...m, id: m.id.trim() }))
      .filter((m) => {
        if (m.id === "" || seenModelIds.has(m.id)) return false;
        seenModelIds.add(m.id);
        return true;
      });

    // Saving an unpriced model is silent and irreversible in effect: every
    // request against it records $0, and the usage that was already spent
    // cannot be re-priced afterwards. The inline warning is easy to scroll
    // past on a long vendor list, so confirm at the point of no return.
    const unpriced = submittedModels.filter(hasNoPrice);
    if (unpriced.length > 0) {
      const proceed = await confirm({
        title:
          unpriced.length === 1
            ? "Save with 1 unpriced model?"
            : `Save with ${unpriced.length} unpriced models?`,
        description:
          "Models without rates are tracked at $0 and don’t count toward " +
          "budget limits. Set rates now or later.",
        confirmText: "Save anyway",
        cancelText: "Set rates first",
        type: "warning",
      });
      if (!proceed) return;
    }
    // Identity overrides are only forwarded when the catalog entry
    // flags either shape (HeaderPair or JSONMetadata) as customizable.
    // Sending them on a non-customizable provider would be a no-op
    // (synth ignores them) but it pollutes the request shape, so
    // guard here.
    const identityOverrides = customizableIdentity
      ? {
          identityHeaderUserId: identityHeaderUserId.trim(),
          identityHeaderGroups: identityHeaderGroups.trim(),
        }
      : {};
    if (isEdit && provider) {
      await updateProvider(provider.id, {
        providerId,
        name,
        upstreamUrl,
        models: submittedModels,
        extraValues: sanitizedExtraValues,
        ...identityOverrides,
        skipTlsVerification: isCustomKind ? skipTlsVerification : false,
        metadataDisabled,
        // Only forward the API key when the user actually rotated it
        ...(apiKey && apiKey !== MASKED_API_KEY ? { apiKey } : {}),
      });
      handleClose();
      return;
    }
    // First create: bootstrap the account's endpoint before the provider
    // exists, as an explicit settings POST. A failure keeps the wizard open
    // (the provider isn't created either) so the operator sees the error and
    // can retry — this used to be a silent backend side effect.
    if (!settingsBootstrapped) {
      const bootstrapped = await bootstrapAgentNetworkSettings(
        bootstrapCluster.trim(),
      );
      if (!bootstrapped) return;
    }
    await addProvider({
      providerId,
      name,
      upstreamUrl,
      apiKey,
      extraValues: sanitizedExtraValues,
      ...identityOverrides,
      skipTlsVerification: isCustomKind ? skipTlsVerification : false,
      metadataDisabled,
      models: submittedModels,
      enabled: true,
    });
    handleClose();
  };

  // providerOptions are sorted into three groups, first-party AI Providers
  // first, then AI Gateways, then the self-hosted / custom catch-all.
  // SelectDropdown renders section headers automatically when options carry a
  // `group` value; the section order tracks first-occurrence in the array.
  const providerOptions = useMemo(() => {
    const groupRank: Record<string, number> = {
      provider: 0,
      gateway: 1,
      custom: 2,
    };
    const groupLabel: Record<string, string> = {
      gateway: "AI Gateways",
      provider: "AI Providers",
      custom: "Other",
    };
    const sorted = [...catalogList].sort((a, b) => {
      const ra = groupRank[a.kind] ?? 99;
      const rb = groupRank[b.kind] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
    return sorted.map((p) => ({
      value: p.id,
      label: p.name,
      searchValue: `${p.name} ${p.id}`,
      group: groupLabel[p.kind] ?? "Other",
      icon: ({ size }: { size?: number }) => (
        <AIProviderLogo providerId={p.id as AIProviderId} size={size ?? 16} />
      ),
    }));
  }, [catalogList]);

  const updateModel = (idx: number, patch: Partial<ProviderModel>) =>
    setModels((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    );

  const removeModel = (idx: number) =>
    setModels((prev) => prev.filter((_, i) => i !== idx));

  // Catalog options the user hasn't already added; falls back to a
  // generic empty row when the catalog is exhausted or there is no
  // catalog (custom providers).
  // Merged: the catalog first, then anything the vendor reported that the
  // catalog does not already carry. Both the per-row picker and "Add More"
  // read this one list, so merging here is all the wiring either needs.
  //
  // A catalog entry wins on collision — it carries prices, and the discovery
  // response deliberately carries none.
  const catalogModelOptions = useMemo<CatalogModelOption[]>(() => {
    const base = catalog?.models ?? [];
    if (discovered.models.length === 0) return base;

    const known = new Set(base.map((m) => m.id));
    const extra = discovered.models
      .filter((m) => !known.has(m.id))
      .map<CatalogModelOption>((m) => ({
        id: m.id,
        label: m.label || m.id,
        input_per_1k: 0,
        output_per_1k: 0,
        pricing_known: m.pricing_known,
      }));
    return [...base, ...extra];
  }, [catalog, discovered.models]);

  // Editing a saved provider shows a masked api key, never the real one, so
  // discovery reuses the stored credential by record id instead. A new
  // provider has to supply the key the operator is typing.
  //
  // That reuse is only right while the form still describes the record the
  // credential belongs to. The API resolves a provider_id request entirely
  // from the stored row — vendor, upstream and key — so switching the vendor
  // dropdown and then asking by record id answers with the OLD vendor's models
  // and offers them for the new one. A replacement key typed over the mask is
  // the same mistake in the other direction: the operator wants that key
  // tested, not the one already saved.
  //
  // Changing only the upstream URL deliberately keeps the saved path. The
  // browser never holds the key, so asking against the edited URL is not
  // something it can do until the record is saved.
  const useSavedCredential =
    isEdit &&
    !!provider?.id &&
    providerId === provider.providerId &&
    apiKey.trim() === MASKED_API_KEY;

  const canDiscoverModels = useMemo(() => {
    if (useSavedCredential) return true;
    return (
      upstreamUrl.trim() !== "" &&
      apiKey.trim() !== "" &&
      // Compared trimmed on both sides: an untrimmed compare lets a padded
      // mask through, and the request then sends the mask as the credential.
      apiKey.trim() !== MASKED_API_KEY
    );
  }, [useSavedCredential, upstreamUrl, apiKey]);

  const loadModelsFromProvider = async () => {
    const found = await discovered.discover(
      useSavedCredential && provider?.id
        ? { catalog_provider_id: providerId, provider_id: provider.id }
        : {
            catalog_provider_id: providerId,
            upstream_url: upstreamUrl.trim(),
            api_key: apiKey.trim(),
          },
    );
    if (found.length === 0) return;

    // Expand the whole list into editable rows, priced. Leaving them behind a
    // dropdown made the operator add and price each one by hand, which is the
    // work this endpoint exists to remove — and the rates it returns are the
    // ones the proxy bills with, so a prefilled row is accurate, not a guess.
    setModels((prev) => {
      // An id already on the form keeps its row untouched. The operator may
      // have set a rate deliberately, and a refresh must not overwrite that
      // with the default it was edited away from.
      const existing = new Set(prev.map((m) => m.id));
      const added = found
        .filter((m) => !existing.has(m.id))
        .map((m) =>
          withModelKey({
            id: m.id,
            // A model NetBird cannot price arrives at zero and is flagged in
            // the row rather than dropped: the vendor says this credential
            // can reach it, so hiding it would hide a model they really have.
            inputPer1k: m.input_per_1k,
            outputPer1k: m.output_per_1k,
            cachedInputPer1k: m.cached_input_per_1k,
            cacheReadPer1k: m.cache_read_per_1k,
            cacheCreationPer1k: m.cache_creation_per_1k,
          }),
        );
      // Drop the blank starter row: it exists to be filled, and there is now
      // something to fill the list with.
      const kept = prev.filter((m) => m.id !== "");
      // Unpriced rows first — they are the ones needing attention, and a long
      // vendor list would otherwise bury them. Sorted here, once, rather than
      // on every render: re-sorting live would make a row jump out from under
      // the cursor the moment a rate was typed into it.
      return sortUnpricedFirst([...kept, ...added]);
    });
  };

  // A discovery result describes one provider, endpoint and credential. Once
  // any of those changes on screen, the previous answer is about a
  // configuration that is no longer being edited, so it is dropped rather than
  // left populating the model picker — whose ids are what save() registers.
  // reset also invalidates any request still in flight.
  const resetDiscovered = discovered.reset;
  useEffect(() => {
    resetDiscovered();
  }, [resetDiscovered, providerId, upstreamUrl, apiKey, open]);

  // Rows carrying no price at all. Saving one records every request against
  // that model as free, so the row is outlined and a single line says so —
  // derived from the rates actually on the form rather than from the discovery
  // response, so the warning clears the moment the operator types a rate, and
  // covers a hand-added row just as well as a discovered one.
  const unpricedModelIds = useMemo(
    () =>
      new Set(
        models.filter((m) => m.id !== "" && hasNoPrice(m)).map((m) => m.id),
      ),
    [models],
  );
  const usedModelIds = useMemo(
    () => new Set(models.map((m) => m.id)),
    [models],
  );
  const addModel = () => {
    const next = catalogModelOptions.find((m) => !usedModelIds.has(m.id));
    if (next) {
      setModels((prev) => [
        ...prev,
        withModelKey({
          id: next.id,
          inputPer1k: next.input_per_1k,
          outputPer1k: next.output_per_1k,
          cachedInputPer1k: next.cached_input_per_1k,
          cacheReadPer1k: next.cache_read_per_1k,
          cacheCreationPer1k: next.cache_creation_per_1k,
        }),
      ]);
      return;
    }
    // No catalog match left — append an empty row the operator can fill.
    setModels((prev) => [
      ...prev,
      withModelKey({ id: "", inputPer1k: 0, outputPer1k: 0 }),
    ]);
  };

  // Which cache-rate fields apply to this provider's models, derived
  // from the catalog's pricing surfaces: "openai" bills cached prompt
  // tokens as a discounted SUBSET of input (one rate), "anthropic" /
  // "bedrock" bill two ADDITIVE buckets (cache read + cache write).
  // Gateways/custom entries (and older backends) declare no surfaces —
  // NetBird can't know the upstream shape, so every field is offered.
  const pricingSurfaces = catalog?.pricing_surfaces ?? [];
  const showCachedInputRate =
    pricingSurfaces.length === 0 || pricingSurfaces.includes("openai");
  const showCacheBucketRates =
    pricingSurfaces.length === 0 ||
    pricingSurfaces.includes("anthropic") ||
    pricingSurfaces.includes("bedrock");

  return (
    <Modal open={open} onOpenChange={(o) => (o ? null : handleClose())}>
      <ModalContent maxWidthClass={"max-w-2xl"}>
        <ModalHeader
          icon={<AgentNetworkIcon className={"fill-netbird"} size={18} />}
          title={isEdit ? "Edit Provider" : "Connect Provider"}
          description={
            isEdit
              ? "Update this provider's configuration."
              : "Connect an AI model provider or gateway to your Agent Network."
          }
          color={"netbird"}
        />

        <Tabs onValueChange={setTab} defaultValue={tab} value={tab}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"provider"}>
              <Sparkles size={14} />
              Provider
            </TabsTrigger>
            <TabsTrigger value={"models"} disabled={!canContinueFromProvider}>
              <Boxes size={14} />
              Models
            </TabsTrigger>
            {showMappings && (
              <TabsTrigger
                value={"mappings"}
                disabled={!canContinueFromProvider}
              >
                <ArrowRightLeft size={14} />
                Mappings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={"provider"} className={"pb-8"}>
            <div className={"px-8 pt-3 flex-col flex gap-6"}>
              {noClustersAvailable && (
                <Callout
                  variant={"warning"}
                  icon={
                    <AlertCircleIcon
                      size={14}
                      className={"shrink-0 relative top-[3px] text-netbird"}
                    />
                  }
                >
                  No active proxy clusters are available. Connect at least one
                  proxy under
                  <InlineLink href={"/reverse-proxy/services"}>
                    {" "}
                    Reverse Proxy
                  </InlineLink>{" "}
                  before adding a provider.
                </Callout>
              )}

              <FormRow
                label={"Provider"}
                helpText={"API provider to expose through NetBird."}
              >
                <SelectDropdown
                  value={providerId}
                  onChange={(v) => {
                    const next = v as AIProviderId;
                    setProviderId(next);
                    // The credential differs per provider (API key vs Vertex
                    // JSON upload), so clear it when switching.
                    setApiKey("");
                    setKeyFileName(null);
                    const c = getById(next);
                    if (c) {
                      setName(c.name);
                      // Gateways like Bifrost / LiteLLM ship with an
                      // empty default_host (operator brings their own
                      // endpoint). Don't pre-fill "https://" — let the
                      // placeholder hint them what to type instead.
                      setUpstreamUrl(
                        next === "vertex_ai_api"
                          ? "https://aiplatform.googleapis.com"
                          : c.default_host
                          ? `https://${c.default_host}`
                          : "",
                      );
                      setModels([]);
                      // Auto-seed the identity inputs from the
                      // catalog defaults when picking a customizable
                      // shape (HeaderPair for Bifrost, JSONMetadata
                      // for Cloudflare) so the operator sees sensible
                      // starting values. They can edit, clear, or
                      // paste their own. Switching away from any
                      // customizable shape wipes the values so they
                      // don't leak onto a non-customizable provider's
                      // wire.
                      const hp = c.identity_injection?.header_pair;
                      const jm = c.identity_injection?.json_metadata;
                      if (hp?.customizable) {
                        setIdentityHeaderUserId(hp.end_user_id_header);
                        setIdentityHeaderGroups(hp.tags_header);
                      } else if (jm?.customizable) {
                        setIdentityHeaderUserId(jm.user_key);
                        setIdentityHeaderGroups(jm.groups_key);
                      } else {
                        setIdentityHeaderUserId("");
                        setIdentityHeaderGroups("");
                      }
                    }
                  }}
                  options={providerOptions}
                  showSearch
                  searchPlaceholder={"Search providers..."}
                  placeholder={"Select provider..."}
                />
              </FormRow>

              <FormRow
                label={
                  providerId === "kimi_api" ? (
                    <>
                      Upstream URL
                      <HelpTooltip
                        content={
                          "Moonshot AI's international platform endpoint. Keep the bare host. Moonshot serves both API shapes with the same key: the path an agent calls rides through to Moonshot, so its base URL picks the shape (Claude Code appends /anthropic; Kimi CLI and OpenAI shaped callers use the bare endpoint). Mainland China accounts use api.moonshot.cn instead."
                        }
                      />
                    </>
                  ) : (
                    "Upstream URL"
                  )
                }
                helpText={upstreamUrlHelpText(providerId)}
              >
                <Input
                  value={upstreamUrl}
                  onChange={(e) => setUpstreamUrl(e.target.value)}
                  placeholder={upstreamUrlPlaceholder(providerId)}
                />
              </FormRow>

              {isCustomKind && (
                <FancyToggleSwitch
                  value={skipTlsVerification}
                  onChange={setSkipTlsVerification}
                  label={
                    <>
                      <ShieldOffIcon size={15} />
                      Skip TLS Verification
                      <span onClick={(e) => e.stopPropagation()}>
                        <HelpTooltip
                          interactive
                          content={
                            <>
                              Skips certificate validation on requests to this
                              provider. Useful for quick testing against
                              endpoints with self-signed certificates. For
                              production we recommend mounting trusted
                              certificates on your proxy instances instead.{" "}
                              <InlineLink
                                href={
                                  "https://docs.netbird.io/agent-network/providers#skip-tls-verification"
                                }
                                target={"_blank"}
                              >
                                Learn more
                                <ExternalLinkIcon size={12} />
                              </InlineLink>
                            </>
                          }
                        />
                      </span>
                    </>
                  }
                  helpText={"Disable upstream TLS certificate validation."}
                />
              )}

              {providerId === "vertex_ai_api" ? (
                <FormRow
                  label={
                    <>
                      Service account JSON key
                      <HelpTooltip
                        content={
                          <>
                            Upload the Vertex AI service account JSON key.
                            NetBird base64-encodes it and prefixes it with{" "}
                            <code className={"text-nb-gray-200"}>
                              keyfile::
                            </code>{" "}
                            before injecting it on every upstream request, so
                            agents never see the key.
                          </>
                        }
                      />
                    </>
                  }
                  helpText={"Upload the service account JSON key file."}
                >
                  <div className={"flex items-center gap-3"}>
                    <Button
                      variant={"secondary"}
                      onClick={() => keyFileInputRef.current?.click()}
                    >
                      <UploadIcon size={14} />
                      {keyFileName || (isEdit && apiKey === MASKED_API_KEY)
                        ? "Replace JSON key"
                        : "Upload JSON key"}
                    </Button>
                    <span className={"text-xs text-nb-gray-300 truncate"}>
                      {keyFileName
                        ? keyFileName
                        : isEdit && apiKey === MASKED_API_KEY
                        ? "A key is already stored"
                        : "No file selected"}
                    </span>
                    <input
                      ref={keyFileInputRef}
                      type={"file"}
                      accept={"application/json,.json"}
                      className={"hidden"}
                      onChange={onJsonKeyUpload}
                    />
                  </div>
                </FormRow>
              ) : (
                <FormRow
                  label={
                    <>
                      Provider API key
                      <HelpTooltip
                        content={
                          <>
                            NetBird injects it as{" "}
                            <code className={"text-nb-gray-200"}>
                              {catalog?.auth_header_template}
                            </code>{" "}
                            on every upstream request, so agents never see the
                            key.
                          </>
                        }
                      />
                    </>
                  }
                  helpText={"The API key issued by the provider."}
                >
                  <Input
                    type={"password"}
                    showPasswordToggle
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    customPrefix={<KeyRound size={14} />}
                    placeholder={
                      providerId === "openai_api" || providerId === "kimi_api"
                        ? "sk-..."
                        : providerId === "anthropic_api"
                        ? "sk-ant-..."
                        : "Paste your API key"
                    }
                  />
                </FormRow>
              )}
              {(catalog?.extra_headers ?? []).map((h) => {
                const ui =
                  EXTRA_HEADER_UI[h.name] ?? fallbackExtraHeaderUI(h.name);
                return (
                  <FormRow
                    key={h.name}
                    label={
                      ui.tooltip ? (
                        <>
                          {ui.label}
                          <HelpTooltip content={ui.tooltip} />
                        </>
                      ) : (
                        ui.label
                      )
                    }
                    helpText={ui.helpText}
                  >
                    <Input
                      value={extraValues[h.name] ?? ""}
                      onChange={(e) =>
                        setExtraValues((prev) => ({
                          ...prev,
                          [h.name]: e.target.value,
                        }))
                      }
                      placeholder={ui.placeholder ?? ""}
                    />
                  </FormRow>
                );
              })}
              <FormRow
                label={"Display name"}
                helpText={"Shown in the Agent Network table."}
              >
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={"e.g. OpenAI"}
                />
              </FormRow>
            </div>
          </TabsContent>

          {showMappings && providerId === "litellm_proxy" && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                {/* The forwarding toggle sits first: it gates the identity
                    mappings described below, so turning it off makes the fixed
                    mapping that follows moot. */}
                <FancyToggleSwitch
                  value={!metadataDisabled}
                  onChange={(v) => setMetadataDisabled(!v)}
                  label={
                    <>
                      <ArrowRightLeft size={15} />
                      Forward Identity Metadata
                    </>
                  }
                  helpText={
                    "Stamp the identity mappings below onto LiteLLM requests."
                  }
                />

                <div>
                  <Label>Identity Mappings</Label>
                  <HelpText className={"mb-0"}>
                    Groups are written into{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      metadata.tags
                    </code>{" "}
                    in the JSON body so LiteLLM can enforce tag budgets and rate
                    limits. The user identity is sent in the{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      x-litellm-end-user-id
                    </code>{" "}
                    header. The proxy strips any client-supplied value first, so
                    an app can&apos;t spoof identity. The configured API key
                    must be a LiteLLM virtual key with{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      metadata.allow_client_tags: true
                    </code>
                    , or LiteLLM silently drops these tags.
                  </HelpText>
                </div>

                <div
                  className={
                    "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30"
                  }
                >
                  <MappingRow
                    header={"x-litellm-end-user-id (header)"}
                    sourceLabel={"User Email"}
                  />
                  <MappingRow
                    header={"metadata.tags (body)"}
                    sourceLabel={"Groups"}
                  />
                </div>
              </div>
            </TabsContent>
          )}

          {showMappings && customizableHeaderPair && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                <div>
                  <Label>Identity Headers</Label>
                  <HelpText className={"mb-0"}>
                    Pick which wire headers carry the caller&apos;s identity on
                    every upstream request. The proxy strips any client-supplied
                    value first, so an app can&apos;t spoof identity. Leave a
                    field empty to disable stamping for that dimension. The
                    defaults shown as placeholders use the{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      x-bf-dim-*
                    </code>{" "}
                    family (Prometheus / OTEL — requires a matching declaration
                    in your gateway&apos;s{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      client.prometheus_labels
                    </code>{" "}
                    config). Switch to{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      x-bf-lh-*
                    </code>{" "}
                    to use Bifrost&apos;s always-on log-metadata path instead —
                    no gateway-side config needed there.
                  </HelpText>
                </div>

                <FormRow
                  label={"User identity header"}
                  helpText={
                    "Wire header name receiving the caller's user email (or peer name when unlinked). Leave empty to skip."
                  }
                >
                  <Input
                    value={identityHeaderUserId}
                    onChange={(e) => setIdentityHeaderUserId(e.target.value)}
                    placeholder={
                      identityDefaultUser || "x-bf-dim-netbird_user_id"
                    }
                  />
                </FormRow>

                <FormRow
                  label={"Groups header"}
                  helpText={
                    "Wire header name receiving the caller's NetBird groups as a comma-separated list. Leave empty to skip."
                  }
                >
                  <Input
                    value={identityHeaderGroups}
                    onChange={(e) => setIdentityHeaderGroups(e.target.value)}
                    placeholder={
                      identityDefaultGroups || "x-bf-dim-netbird_groups"
                    }
                  />
                </FormRow>
              </div>
            </TabsContent>
          )}

          {showMappings && customizableJsonMetadata && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                <div>
                  <Label>Identity Metadata</Label>
                  <HelpText className={"mb-0"}>
                    NetBird stamps a JSON object onto the{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      {jsonMetadataHeader || "metadata"}
                    </code>{" "}
                    header with the caller&apos;s identity so the gateway&apos;s
                    logs and analytics key off the real user, not whichever app
                    process happens to hold the API token. Pick the JSON key
                    names that match your existing log filters; leave a field
                    empty to omit that key from the JSON. The proxy strips any
                    client-supplied value first, so an app can&apos;t spoof
                    identity.
                  </HelpText>
                </div>

                <FormRow
                  label={"User identity key"}
                  helpText={
                    "JSON key receiving the caller's user email (or peer name when unlinked). Leave empty to skip."
                  }
                >
                  <Input
                    value={identityHeaderUserId}
                    onChange={(e) => setIdentityHeaderUserId(e.target.value)}
                    placeholder={identityDefaultUser || "netbird_user_id"}
                  />
                </FormRow>

                <FormRow
                  label={"Groups key"}
                  helpText={
                    "JSON key receiving the caller's NetBird groups as a comma-separated string. Leave empty to skip."
                  }
                >
                  <Input
                    value={identityHeaderGroups}
                    onChange={(e) => setIdentityHeaderGroups(e.target.value)}
                    placeholder={identityDefaultGroups || "netbird_groups"}
                  />
                </FormRow>
              </div>
            </TabsContent>
          )}

          {showMappings && providerId === "portkey" && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                <div>
                  <Label>Identity Metadata</Label>
                  <HelpText className={"mb-0"}>
                    NetBird stamps the{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      x-portkey-metadata
                    </code>{" "}
                    header with a JSON object so Portkey&apos;s analytics and
                    budgets key off the real caller. The proxy strips any
                    client-supplied value first, so an app can&apos;t spoof
                    identity. Per Portkey&apos;s 128-character cap each value is
                    truncated when needed. The mapping is fixed in this release.
                  </HelpText>
                </div>

                <div
                  className={
                    "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30"
                  }
                >
                  <MappingRow header={"_user"} sourceLabel={"User Email"} />
                  <MappingRow header={"groups"} sourceLabel={"Groups"} />
                </div>
              </div>
            </TabsContent>
          )}

          {showMappings && providerId === "bedrock_api" && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                {/* The forwarding toggle sits first: it gates the identity
                    metadata described below, so turning it off makes the fixed
                    mapping that follows moot. */}
                <FancyToggleSwitch
                  value={!metadataDisabled}
                  onChange={(v) => setMetadataDisabled(!v)}
                  label={
                    <>
                      <ArrowRightLeft size={15} />
                      Forward Identity Metadata
                    </>
                  }
                  helpText={
                    "Stamp the identity metadata below onto Bedrock requests."
                  }
                />

                <div>
                  <Label>Identity Metadata</Label>
                  <HelpText className={"mb-0"}>
                    NetBird stamps the caller&apos;s identity into the{" "}
                    <InlineLink
                      href={
                        "https://docs.aws.amazon.com/bedrock/latest/userguide/cost-mgmt-request-metadata.html"
                      }
                      target={"_blank"}
                    >
                      <code
                        className={
                          "text-xs font-mono bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                        }
                      >
                        X-Amzn-Bedrock-Request-Metadata
                      </code>
                    </InlineLink>{" "}
                    header, so you can break Bedrock spend down by user and
                    group. Client-supplied values are stripped and sanitized.
                  </HelpText>
                </div>

                <div
                  className={
                    "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30"
                  }
                >
                  <MappingRow header={"user"} sourceLabel={"User Email"} />
                  <MappingRow header={"group"} sourceLabel={"Groups"} />
                </div>
              </div>
            </TabsContent>
          )}

          {showMappings && providerId === "vercel_ai_gateway" && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                <div>
                  <Label>Identity Headers</Label>
                  <HelpText className={"mb-0"}>
                    NetBird stamps the user identity and group list onto{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      ai-reporting-user
                    </code>{" "}
                    and{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      ai-reporting-tags
                    </code>{" "}
                    on every upstream request. Vercel groups its Custom
                    Reporting API by these dimensions ({" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      group_by=user
                    </code>{" "}
                    /{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      group_by=tag
                    </code>
                    ). Header names are fixed by Vercel&apos;s API contract —
                    renaming would silently disable attribution. The proxy
                    strips any client-supplied value first.
                  </HelpText>
                </div>

                <div
                  className={
                    "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30"
                  }
                >
                  <MappingRow
                    header={"ai-reporting-user"}
                    sourceLabel={"User Email"}
                  />
                  <MappingRow
                    header={"ai-reporting-tags"}
                    sourceLabel={"Groups (CSV)"}
                  />
                </div>

                <HelpText className={"mb-0"}>
                  <strong>Caveats:</strong> Vercel caps tags at 10 per request
                  (each 1–64 chars) and the user value at 256 chars. Members of
                  more than 10 groups will see Vercel reject the request with
                  HTTP 400 — re-scope group memberships if you hit it. Vercel
                  charges $0.075 per 1,000 unique user/tag values written;
                  budget accordingly for high-cardinality use cases.
                </HelpText>
              </div>
            </TabsContent>
          )}

          {showMappings && providerId === "openrouter" && (
            <TabsContent value={"mappings"} className={"pb-8"}>
              <div className={"px-8 pt-3 flex-col flex gap-4"}>
                <div>
                  <Label>Identity Attribution</Label>
                  <HelpText className={"mb-0"}>
                    NetBird stamps the caller&apos;s user identity onto the
                    request body&apos;s{" "}
                    <code
                      className={
                        "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
                      }
                    >
                      user
                    </code>{" "}
                    field — that&apos;s the OpenAI-standard field OpenRouter
                    consults for per-user analytics. The proxy overwrites any
                    client-supplied value first, so an app can&apos;t spoof
                    identity.
                  </HelpText>
                </div>

                <div
                  className={
                    "rounded-md overflow-hidden border border-nb-gray-900 bg-nb-gray-920/30"
                  }
                >
                  <MappingRow
                    header={"user (body)"}
                    sourceLabel={"User Email"}
                  />
                </div>

                <HelpText className={"mb-0"}>
                  <strong>No groups dimension.</strong> OpenRouter does not
                  document a per-request tag, label, or team field — only
                  per-user identity. NetBird&apos;s group memberships are not
                  propagated to OpenRouter; if you need per-group attribution,
                  query NetBird&apos;s own access log instead of
                  OpenRouter&apos;s analytics.
                </HelpText>
                <HelpText className={"mb-0"}>
                  <strong>App branding</strong> (HTTP-Referer +
                  X-OpenRouter-Title) is set per-provider on the Provider tab,
                  not per-request. Operators who fill those in get their app
                  surfaced on OpenRouter&apos;s public rankings and per-app
                  analytics.
                </HelpText>
              </div>
            </TabsContent>
          )}

          <TabsContent value={"models"} className={"pb-8"}>
            <div className={"px-8 pt-3 flex-col flex gap-3"}>
              <div>
                <Label>Models</Label>
                <HelpText>
                  Models exposed through this endpoint, with the per-1k
                  input/output prices used for cost tracking. Empty = all
                  catalog models allowed at catalog prices. Cache rates left
                  empty fall back to NetBird&apos;s defaults for the model; 0
                  bills cached tokens at the input rate.
                </HelpText>
              </div>

              <div className={"flex items-center gap-3"}>
                <Button
                  variant={"secondary"}
                  size={"xs"}
                  disabled={discovered.isLoading || !canDiscoverModels}
                  onClick={loadModelsFromProvider}
                >
                  <RefreshCwIcon size={13} />
                  {discovered.isLoading
                    ? "Loading models…"
                    : "Load models from provider"}
                </Button>
                {!canDiscoverModels && (
                  <HelpText className={"!mb-0"}>
                    Enter the endpoint URL and API key first.
                  </HelpText>
                )}
                {discovered.notSupported && (
                  <HelpText className={"!mb-0"}>
                    This provider has no model listing endpoint — the catalog
                    list is used instead.
                  </HelpText>
                )}
                {discovered.error && (
                  <HelpText
                    className={"!mb-0 text-orange-500 dark:text-orange-400"}
                  >
                    {discovered.error}
                  </HelpText>
                )}
              </div>

              {unpricedModelIds.size > 0 && (
                // A callout rather than a line of help text: this is the one
                // thing on the tab that costs money to miss, and it sat in the
                // same grey run of prose as everything else.
                <Callout
                  variant={"warning"}
                  icon={
                    <AlertCircleIcon
                      size={14}
                      className={"shrink-0 relative top-[3px]"}
                    />
                  }
                >
                  {unpricedModelIds.size === 1
                    ? "The model below has"
                    : `The ${unpricedModelIds.size} models below have`}{" "}
                  no cost set. Usage is tracked at $0 and won&apos;t count
                  toward budget limits.
                </Callout>
              )}

              {models.map((row, idx) => (
                <ModelRowEditor
                  key={row._key}
                  row={row}
                  catalogModels={catalogModelOptions}
                  usedIds={usedModelIds}
                  needsPrice={unpricedModelIds.has(row.id)}
                  onChangeId={(id) => {
                    const fromCatalog = catalogModelOptions.find(
                      (m) => m.id === id,
                    );
                    if (fromCatalog) {
                      updateModel(idx, {
                        id,
                        inputPer1k: fromCatalog.input_per_1k,
                        outputPer1k: fromCatalog.output_per_1k,
                        cachedInputPer1k: fromCatalog.cached_input_per_1k,
                        cacheReadPer1k: fromCatalog.cache_read_per_1k,
                        cacheCreationPer1k: fromCatalog.cache_creation_per_1k,
                      });
                    } else {
                      updateModel(idx, { id });
                    }
                  }}
                  onChangeInput={(n) => updateModel(idx, { inputPer1k: n })}
                  onChangeOutput={(n) => updateModel(idx, { outputPer1k: n })}
                  showCachedInputRate={showCachedInputRate}
                  showCacheBucketRates={showCacheBucketRates}
                  onChangeCachedInput={(n) =>
                    updateModel(idx, { cachedInputPer1k: n })
                  }
                  onChangeCacheRead={(n) =>
                    updateModel(idx, { cacheReadPer1k: n })
                  }
                  onChangeCacheCreation={(n) =>
                    updateModel(idx, { cacheCreationPer1k: n })
                  }
                  onRemove={() => removeModel(idx)}
                />
              ))}

              <Button
                variant={"dotted"}
                className={"w-full"}
                size={"sm"}
                onClick={addModel}
              >
                <PlusIcon size={14} />
                Add More
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                href={"https://docs.netbird.io/agent-network/providers"}
                target={"_blank"}
              >
                Agent Network Providers
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            {tab === "provider" && (
              <>
                <ModalClose asChild>
                  <Button variant={"secondary"} onClick={handleClose}>
                    Cancel
                  </Button>
                </ModalClose>
                <Button
                  variant={"primary"}
                  onClick={() => setTab("models")}
                  disabled={!canContinueFromProvider}
                >
                  Continue
                </Button>
              </>
            )}
            {tab === "models" && (
              <>
                <Button
                  variant={"secondary"}
                  onClick={() => setTab("provider")}
                >
                  Back
                </Button>
                {showMappings ? (
                  <Button
                    variant={"primary"}
                    onClick={() => setTab("mappings")}
                    disabled={!canContinueFromProvider}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant={"primary"}
                    onClick={handleSubmit}
                    disabled={!canContinueFromProvider}
                  >
                    {isEdit ? (
                      "Save Changes"
                    ) : (
                      <>
                        <PlusCircle size={16} />
                        Connect Provider
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
            {tab === "mappings" && (
              <>
                <Button variant={"secondary"} onClick={() => setTab("models")}>
                  Back
                </Button>
                <Button
                  variant={"primary"}
                  onClick={handleSubmit}
                  disabled={!canContinueFromProvider}
                >
                  {isEdit ? (
                    "Save Changes"
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      Connect Provider
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function FormRow({
  label,
  helpText,
  children,
}: {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex justify-between items-start gap-10"}>
      <div className={"max-w-sm"}>
        <Label>{label}</Label>
        <HelpText margin={false}>{helpText}</HelpText>
      </div>
      <div className={"w-[260px] shrink-0"}>{children}</div>
    </div>
  );
}

// CUSTOM_MODEL_OPTION is the sentinel value of the "Custom model…"
// dropdown entry. Never a real model id (vendors don't use NUL-ish
// double-underscore namespacing), never sent to the API — selecting it
// only flips the row into free-text mode.
const CUSTOM_MODEL_OPTION = "__netbird_custom_model__";

type CatalogModelOption = {
  id: string;
  label: string;
  input_per_1k: number;
  output_per_1k: number;
  cached_input_per_1k?: number;
  cache_read_per_1k?: number;
  cache_creation_per_1k?: number;
  // false for a model the vendor reported but NetBird's pricing table does
  // not know. It still lands with 0 rates, which is indistinguishable from a
  // genuinely free model — so the Models tab names these explicitly rather
  // than letting the operator register one that meters at zero.
  pricing_known?: boolean;
};

// priceToInput renders a stored price as an editable string, always using "."
// as the decimal separator regardless of the browser locale.
function priceToInput(n: number): string {
  return Number.isFinite(n) ? String(n) : "";
}

// priceFromInput parses an operator-typed price, accepting a "," as the decimal
// separator (some keyboards/locales) and normalising it to a plain number.
function priceFromInput(s: string): number {
  return parseFloat(s.replace(/,/g, ".")) || 0;
}

// optionalPriceFromInput parses a price whose empty state is meaningful. It
// reports undefined for anything that isn't a number ("", "abc") instead of
// falling back to 0 — for cache rates an explicit 0 is a real setting ("bill
// cached tokens at the input rate"), so a typo must not silently become one.
function optionalPriceFromInput(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const n = parseFloat(t.replace(/,/g, "."));
  return Number.isFinite(n) ? n : undefined;
}

// OptionalPriceField is a price input whose EMPTY state is meaningful:
// empty = undefined = "inherit NetBird's default rate for this model",
// while an explicit 0 disables the cache discount. It must never coerce
// one into the other, so it keeps its own string state and only reports
// undefined for a blank box.
function OptionalPriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
}) {
  const [str, setStr] = useState(() =>
    value === undefined ? "" : priceToInput(value),
  );
  // Re-sync when the value is set from outside (catalog model pick),
  // but not while the operator is mid-typing the same value.
  useEffect(() => {
    const parsed = optionalPriceFromInput(str);
    if (parsed !== value) {
      setStr(value === undefined ? "" : priceToInput(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={"flex-1 min-w-0"}>
      <Label>{label}</Label>
      <Input
        type={"text"}
        inputMode={"decimal"}
        value={str}
        placeholder={"default"}
        onChange={(e) => {
          setStr(e.target.value);
          onChange(optionalPriceFromInput(e.target.value));
        }}
      />
    </div>
  );
}

function ModelRowEditor({
  row,
  catalogModels,
  usedIds,
  needsPrice,
  onChangeId,
  onChangeInput,
  onChangeOutput,
  showCachedInputRate,
  showCacheBucketRates,
  onChangeCachedInput,
  onChangeCacheRead,
  onChangeCacheCreation,
  onRemove,
}: {
  row: ProviderModel;
  catalogModels: CatalogModelOption[];
  usedIds: Set<string>;
  // The row carries no price, so every request against it would record as
  // free. Outlined rather than blocked: zero is a legitimate rate for a
  // self-hosted model, and only the operator knows which case this is.
  needsPrice: boolean;
  onChangeId: (id: string) => void;
  onChangeInput: (n: number) => void;
  onChangeOutput: (n: number) => void;
  // Which cache-rate fields apply to this provider's billing shape;
  // see the pricing_surfaces derivation in the modal body.
  showCachedInputRate: boolean;
  showCacheBucketRates: boolean;
  onChangeCachedInput: (n: number | undefined) => void;
  onChangeCacheRead: (n: number | undefined) => void;
  onChangeCacheCreation: (n: number | undefined) => void;
  onRemove: () => void;
}) {
  // Editable text for the price fields. We keep the raw string locally so the
  // operator can type intermediate values ("0.", "0,00") without the number
  // round-trip clobbering the cursor. The number is propagated to the parent
  // on every change; a "." is always shown even in comma-decimal locales.
  const [inputStr, setInputStr] = useState(() => priceToInput(row.inputPer1k));
  const [outputStr, setOutputStr] = useState(() =>
    priceToInput(row.outputPer1k),
  );
  // Re-sync when the price is set from outside (e.g. picking a catalog model
  // fills its prices), but not while the operator is mid-typing the same value.
  useEffect(() => {
    if (priceFromInput(inputStr) !== row.inputPer1k) {
      setInputStr(priceToInput(row.inputPer1k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.inputPer1k]);
  useEffect(() => {
    if (priceFromInput(outputStr) !== row.outputPer1k) {
      setOutputStr(priceToInput(row.outputPer1k));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.outputPer1k]);

  // Whether this provider type ships a catalog of preset models.
  // Stable across keystrokes — we mustn't let this flip mid-typing or
  // React will unmount the input and steal focus.
  const hasCatalog = catalogModels.length > 0;

  // Custom-model entry: catalog providers get a "Custom model…" option
  // that swaps the dropdown for a free-text input, so operators can add
  // models NetBird doesn't list yet (e.g. a model released after this
  // build). Rows loaded with an id the catalog doesn't know start in
  // custom mode so their id is editable rather than trapped in a
  // single-option dropdown.
  const [customMode, setCustomMode] = useState(
    () =>
      hasCatalog &&
      row.id !== "" &&
      !catalogModels.some((m) => m.id === row.id),
  );
  // The catalog is fetched async, so an edit-modal row can mount before it
  // arrives — the initializer then sees no catalog and leaves customMode off,
  // trapping an unknown id in a dropdown that can't represent it. Re-evaluate
  // once the catalog lands. Keyed on hasCatalog only: later catalog/row churn
  // must not undo the operator's own custom-mode choice.
  useEffect(() => {
    if (!hasCatalog || row.id === "") return;
    if (!catalogModels.some((m) => m.id === row.id)) setCustomMode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCatalog]);

  // Catalog options excluding the ones already on other rows, plus the
  // custom-model escape hatch.
  const dropdownOptions = useMemo(() => {
    const visible = catalogModels.filter(
      (m) => m.id === row.id || !usedIds.has(m.id),
    );
    const opts = visible.map((m) => ({ value: m.id, label: m.label }));
    opts.push({ value: CUSTOM_MODEL_OPTION, label: "Custom model…" });
    return opts;
  }, [catalogModels, usedIds, row.id]);

  const showCacheLine = showCachedInputRate || showCacheBucketRates;
  const hasCacheValues =
    row.cachedInputPer1k !== undefined ||
    row.cacheReadPer1k !== undefined ||
    row.cacheCreationPer1k !== undefined;
  // Cache rates live behind a per-row disclosure, collapsed by default:
  // most operators keep NetBird's defaults, so the row stays compact.
  // The collapsed summary ("· custom" vs "· default") signals when a
  // row carries stored rates worth expanding.
  const [cacheOpen, setCacheOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded border bg-nb-gray-900/20",
        needsPrice
          ? "border-yellow-500/60 bg-yellow-500/5"
          : "border-nb-gray-800",
      )}
    >
      <div className={"flex items-end gap-2"}>
        <div className={"flex-1 min-w-0"}>
          <Label>Model</Label>
          {hasCatalog && !customMode ? (
            <SelectDropdown
              value={row.id}
              onChange={(v) => {
                if (v === CUSTOM_MODEL_OPTION) {
                  setCustomMode(true);
                  onChangeId("");
                  return;
                }
                onChangeId(v);
              }}
              options={dropdownOptions}
              placeholder={"Select a model..."}
            />
          ) : hasCatalog ? (
            <div className={"flex gap-2"}>
              <Input
                value={row.id}
                onChange={(e) => onChangeId(e.target.value)}
                placeholder={"e.g. claude-fable-6"}
                autoFocus={row.id === ""}
              />
              <Button
                variant={"default-outline"}
                className={"h-[42px] !px-3 shrink-0"}
                title={"Pick from catalog instead"}
                onClick={() => {
                  setCustomMode(false);
                  onChangeId("");
                }}
              >
                <ListIcon size={15} />
              </Button>
            </div>
          ) : (
            <Input
              value={row.id}
              onChange={(e) => onChangeId(e.target.value)}
              placeholder={"e.g. gpt-4o-mini"}
            />
          )}
        </div>
        <div className={"w-[120px] shrink-0"}>
          <Label>Input $/1k</Label>
          <Input
            type={"text"}
            inputMode={"decimal"}
            value={inputStr}
            onChange={(e) => {
              setInputStr(e.target.value);
              onChangeInput(priceFromInput(e.target.value));
            }}
          />
        </div>
        <div className={"w-[120px] shrink-0"}>
          <Label>Output $/1k</Label>
          <Input
            type={"text"}
            inputMode={"decimal"}
            value={outputStr}
            onChange={(e) => {
              setOutputStr(e.target.value);
              onChangeOutput(priceFromInput(e.target.value));
            }}
          />
        </div>
        <Button
          variant={"default-outline"}
          className={"h-[42px] !px-3"}
          onClick={onRemove}
        >
          <MinusCircleIcon size={15} />
        </Button>
      </div>
      {showCacheLine && (
        <>
          <button
            type={"button"}
            onClick={() => setCacheOpen((v) => !v)}
            className={
              "flex items-center gap-1 text-xs text-nb-gray-400 hover:text-nb-gray-200 transition-colors w-fit"
            }
          >
            <ChevronRightIcon
              size={13}
              className={
                "transition-transform " + (cacheOpen ? "rotate-90" : "")
              }
            />
            Cache pricing
            {!cacheOpen && (
              <span className={"text-nb-gray-500"}>
                {hasCacheValues ? "· custom" : "· default"}
              </span>
            )}
          </button>
          {cacheOpen && (
            <div
              className={
                "flex items-end gap-2 pt-2 border-t border-nb-gray-900"
              }
            >
              {showCachedInputRate && (
                <OptionalPriceField
                  label={"Cached input $/1k"}
                  value={row.cachedInputPer1k}
                  onChange={onChangeCachedInput}
                />
              )}
              {showCacheBucketRates && (
                <>
                  <OptionalPriceField
                    label={"Cache read $/1k"}
                    value={row.cacheReadPer1k}
                    onChange={onChangeCacheRead}
                  />
                  <OptionalPriceField
                    label={"Cache write $/1k"}
                    value={row.cacheCreationPer1k}
                    onChange={onChangeCacheCreation}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MappingRow({
  header,
  sourceLabel,
}: {
  header: string;
  sourceLabel: string;
}) {
  return (
    <div
      className={
        "flex items-center gap-3 px-4 py-3 border-b border-nb-gray-900 last:border-b-0"
      }
    >
      <div className={"flex-1 min-w-0"}>
        <code
          className={
            "text-xs font-mono text-nb-gray-100 bg-nb-gray-900/60 rounded px-1.5 py-0.5"
          }
        >
          {header}
        </code>
      </div>
      <ArrowRightLeft size={14} className={"shrink-0 text-nb-gray-500"} />
      <div className={"flex-1 min-w-0 text-sm text-nb-gray-100"}>
        {sourceLabel}
      </div>
    </div>
  );
}
