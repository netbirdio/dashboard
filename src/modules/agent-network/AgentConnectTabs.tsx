"use client";

import Code from "@components/Code";
import { Input } from "@components/Input";
import { SelectDropdown } from "@components/select/SelectDropdown";
import SmallParagraph from "@components/SmallParagraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import useCopyToClipboard from "@hooks/useCopyToClipboard";
import { cn } from "@utils/helpers";
import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";
import ClaudeIcon from "@/assets/icons/ClaudeIcon";
import KimiIcon from "@/assets/icons/KimiIcon";
import OpenAIIcon from "@/assets/icons/OpenAIIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import AIProviderLogo from "@/modules/agent-network/AIProviderLogo";
import {
  AIProvider,
  AIProviderId,
} from "@/modules/agent-network/data/mockData";

// Same gray-to-netbird treatment the install-peer modal gives its OS tabs.
const TAB_ICON =
  "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all";

// providerIcon badges a backend option with the same mark the providers
// tables show for that catalog entry.
const providerIcon = (id: AIProviderId) =>
  function ProviderOptionIcon({ size }: { size?: number }) {
    return <AIProviderLogo providerId={id} size={size ?? 16} />;
  };

// ConfigPath sets a file path in the same mono face as the block below it, so
// the part of the header the reader has to act on stands out from the prose.
function ConfigPath({ path }: { path: string }) {
  return <code className={"font-mono text-nb-gray-100"}>{path}</code>;
}

type ClaudeMode = "config" | "shell";

// ModeSwitch picks which shape of the same config to show. Underlined tabs
// rather than a link, so both options are visible before either is chosen.
function ModeSwitch({
  value,
  onChange,
}: {
  value: ClaudeMode;
  onChange: (mode: ClaudeMode) => void;
}) {
  const options: { value: ClaudeMode; label: string }[] = [
    { value: "config", label: "JSON" },
    { value: "shell", label: "Shell" },
  ];

  return (
    // Full height and pulled down over the header's 1px rule, so the active
    // tab's underline reads as part of that line rather than floating above it.
    <div className={"flex items-stretch gap-3 shrink-0 -mb-px"}>
      {options.map((option) => (
        <button
          key={option.value}
          type={"button"}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center text-xs font-medium border-b-2 transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nb-gray-500 focus-visible:rounded-sm",
            value === option.value
              ? "border-white text-nb-gray-100"
              : "border-transparent text-nb-gray-400 hover:text-nb-gray-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Snippet renders a copyable Code block from a list of lines. Given a title it
// grows a header bar carrying that title, whatever control the caller passes,
// and the copy button — so the thing the block is for, and the switch between
// its shapes, sit on the block instead of floating above it. Wrapped in
// min-w-0 so its scroll area handles long lines instead of widening its
// container. By default the displayed lines are what gets copied (joined with
// newlines); pass copyText to copy something different — e.g. show a curl
// command across multiple lines but copy it as one line.
function Snippet({
  title,
  action,
  lines,
  copyText,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  lines: string[];
  copyText?: string;
}) {
  const [, copy, copied] = useCopyToClipboard(copyText ?? lines.join("\n"));

  const code = (
    <Code
      codeToCopy={copyText ?? lines.join("\n")}
      message={"Copied to clipboard"}
      showCopyIcon={!title}
      className={title ? "rounded-none border-0" : undefined}
    >
      {lines.map((line, i) => (
        <Code.Line key={i}>{line}</Code.Line>
      ))}
    </Code>
  );

  if (!title) return <div className={"min-w-0"}>{code}</div>;

  return (
    <div
      className={
        "min-w-0 rounded-md border border-neutral-200 dark:border-nb-gray-700 overflow-hidden"
      }
    >
      <div
        className={
          "flex items-stretch justify-between gap-3 px-3 border-b border-neutral-200 dark:border-nb-gray-700 bg-gray-50 dark:bg-nb-gray-850"
        }
      >
        <span className={"text-xs text-nb-gray-200 truncate self-center py-3"}>
          {title}
        </span>
        <div className={"flex items-stretch gap-5 shrink-0"}>
          {action}
          <button
            type={"button"}
            onClick={() => copy("Copied to clipboard")}
            aria-label={"Copy snippet"}
            className={
              "self-center text-nb-gray-400 hover:text-nb-gray-100 transition-colors cursor-pointer"
            }
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          </button>
        </div>
      </div>
      {code}
    </div>
  );
}

// ConnectExample is the request the SDK and cURL snippets send: the API shape
// and a model to ask for.
export type ConnectExample = { api: "openai" | "anthropic"; model: string };

const DEFAULT_MODEL: Record<ConnectExample["api"], string> = {
  openai: "gpt-5.5",
  anthropic: "claude-opus-5",
};

const DEFAULT_EXAMPLE: ConnectExample = {
  api: "openai",
  model: DEFAULT_MODEL.openai,
};

// Bedrock and Vertex carry the model in the URL path, under ids the account
// owns (an AWS inference profile, a GCP project), so no fixed request routes
// to them.
const PATH_ROUTED: AIProviderId[] = ["bedrock_api", "vertex_ai_api"];

// ConnectProvider is a provider the caller can reach, as the picker offers
// it: its API shape and the models it serves (empty when any model goes).
export type ConnectProvider = {
  name: string;
  catalogId: string;
  api: ConnectExample["api"];
  models: string[];
};

// fromAccountProviders reads the account's providers (the onboarding step):
// the Anthropic Messages API for Anthropic, Chat Completions for everything
// else.
export const fromAccountProviders = (
  providers: Pick<AIProvider, "name" | "providerId" | "models">[],
): ConnectProvider[] =>
  providers.map((p) => ({
    name: p.name,
    catalogId: p.providerId,
    api: p.providerId === "anthropic_api" ? "anthropic" : "openai",
    models: p.models.map((m) => m.id),
  }));

// The Claude Code config each provider needs; providers missing here speak
// the OpenAI shape only, which Claude Code can't use.
const CLAUDE_BACKEND: Record<string, "vertex" | "bedrock" | "kimi"> = {
  vertex_ai_api: "vertex",
  bedrock_api: "bedrock",
  kimi_api: "kimi",
};

// A one-word answer keeps a test request quick. Only Anthropic gets a token
// cap, which its API requires: OpenAI's reasoning models refuse max_tokens,
// and not every OpenAI-compatible provider takes max_completion_tokens.
const PROMPT = "Say hello in one word.";
const MAX_TOKENS = 32;

// sdkLines calls the SDK of the example's API shape. Both SDKs insist on an
// API key, which NetBird swaps for the provider's.
function sdkLines({ api, model }: ConnectExample, baseUrl: string): string[] {
  const messages = `    messages=[{"role": "user", "content": "${PROMPT}"}],`;
  if (api === "anthropic") {
    return [
      `from anthropic import Anthropic`,
      ``,
      `client = Anthropic(`,
      `    base_url="${baseUrl}",`,
      `    api_key="not-needed",`,
      `)`,
      ``,
      `client.messages.create(`,
      `    model="${model}",`,
      `    max_tokens=${MAX_TOKENS},`,
      messages,
      `)`,
    ];
  }
  return [
    `from openai import OpenAI`,
    ``,
    `client = OpenAI(`,
    `    base_url="${baseUrl}/v1",`,
    `    api_key="not-needed",`,
    `)`,
    ``,
    `client.chat.completions.create(`,
    `    model="${model}",`,
    messages,
    `)`,
  ];
}

// curlSnippet shows the request with its JSON body pretty-printed (curl takes
// a multi-line single-quoted body) and copies it as one line. Anthropic's API
// refuses a request without a version header, which the proxy passes through.
function curlSnippet({ api, model }: ConnectExample, baseUrl: string) {
  const anthropic = api === "anthropic";
  const url = `${baseUrl}/v1/${anthropic ? "messages" : "chat/completions"}`;
  const headers = [
    "Content-Type: application/json",
    ...(anthropic ? ["anthropic-version: 2023-06-01"] : []),
  ];
  const messages = [{ role: "user", content: PROMPT }];
  const body = anthropic
    ? { model, max_tokens: MAX_TOKENS, messages }
    : { model, messages };
  return {
    lines: [
      `curl ${url} \\`,
      ...headers.map((h) => `  -H "${h}" \\`),
      `  -d '{`,
      `    "model": "${model}",`,
      ...(anthropic ? [`    "max_tokens": ${MAX_TOKENS},`] : []),
      `    "messages": [`,
      `      { "role": "user", "content": "${PROMPT}" }`,
      `    ]`,
      `  }'`,
    ],
    copyText: [
      `curl ${url}`,
      ...headers.map((h) => `-H "${h}"`),
      `-d '${JSON.stringify(body)}'`,
    ].join(" "),
  };
}

// json lays out a config object as snippet lines.
const json = (value: object) => JSON.stringify(value, null, 2).split("\n");

// openCodeLines registers the endpoint as an OpenCode provider: the AI SDK's
// Anthropic package for the Messages API, its OpenAI-compatible one (Chat
// Completions) otherwise. Both take the /v1 base and insist on an API key.
function openCodeLines({ api, model }: ConnectExample, baseUrl: string) {
  return json({
    $schema: "https://opencode.ai/config.json",
    provider: {
      netbird: {
        npm:
          api === "anthropic"
            ? "@ai-sdk/anthropic"
            : "@ai-sdk/openai-compatible",
        name: "NetBird",
        options: { baseURL: `${baseUrl}/v1`, apiKey: "not-needed" },
        models: { [model]: {} },
      },
    },
    model: `netbird/${model}`,
  });
}

// piModelsLines registers the endpoint as a pi provider. pi appends the API
// path itself: /v1/messages to an Anthropic base, /chat/completions to an
// OpenAI one. Its models stay unavailable without an apiKey, so it gets a
// placeholder.
function piModelsLines({ api, model }: ConnectExample, baseUrl: string) {
  const anthropic = api === "anthropic";
  return json({
    providers: {
      netbird: {
        baseUrl: anthropic ? baseUrl : `${baseUrl}/v1`,
        api: anthropic ? "anthropic-messages" : "openai-completions",
        apiKey: "not-needed",
        models: [{ id: model }],
      },
    },
  });
}

// AgentConnectTabs renders the per-tool connect snippets (Claude Code, Codex,
// OpenCode, pi, an SDK, cURL) under a provider and model picker for a given endpoint. Rendered inline wherever the config
// belongs — the Connect Agent page and the onboarding "Configure your agent"
// step. listClassName / contentClassName let the caller tune horizontal
// padding, since each host sits in a different gutter.
export function AgentConnectTabs({
  endpoint,
  className = "mt-2",
  listClassName = "px-8",
  contentClassName = "px-6 py-2",
  defaultTab = "claude-code",
  providers = [],
}: {
  endpoint: string;
  // Spacing above the tab strip, so each host can set the gap its own layout
  // calls for.
  className?: string;
  listClassName?: string;
  contentClassName?: string;
  // Which tab opens first. Callers that know the connected provider pass the
  // matching tool (e.g. Anthropic → claude-code, OpenAI → curl). Keyed below
  // so a late-resolving defaultTab still re-initialises the tabs.
  defaultTab?: string;
  // The providers the caller can reach. The picker offers them and their
  // models, and every snippet asks for the pick. Kimi-specific config
  // surfaces (the Kimi CLI tab and the Kimi variant inside the Claude Code
  // tab) only render when a kimi_api provider is actually connected —
  // showing Moonshot setup against an endpoint that can't route to Kimi
  // would just be a trap.
  providers?: ConnectProvider[];
}) {
  const hasKimi = providers.some((p) => p.catalogId === "kimi_api");
  // The pick is derived from the list on each render rather than copied into
  // state, so a list that resolves late still lands on a provider: the first
  // one a fixed request reaches, Anthropic-shaped first since Claude Code is
  // the first tab. With no providers the snippets keep
  // the default request.
  const [pick, setPick] = React.useState<{ name?: string; model?: string }>({});
  const routedByPath = (p: ConnectProvider) =>
    PATH_ROUTED.includes(p.catalogId as AIProviderId);
  const provider =
    providers.find((p) => p.name === pick.name) ??
    providers.find((p) => p.api === "anthropic" && !routedByPath(p)) ??
    providers.find((p) => !routedByPath(p)) ??
    providers[0];
  const pathRouted = !!provider && routedByPath(provider);
  const api = provider?.api ?? DEFAULT_EXAMPLE.api;
  // chosenModel is unset when the provider lists no models and none was
  // typed; tools that pick their own model then keep doing so.
  const chosenModel = pick.model || provider?.models[0];
  const model = chosenModel || DEFAULT_MODEL[api];
  const picked: ConnectExample = { api, model };
  const baseUrl = `https://${endpoint}`;
  const openaiBase = `${baseUrl}/v1`;
  const [claudeMode, setClaudeMode] = React.useState<ClaudeMode>("config");
  // Which backend the Claude Code config targets follows the picked
  // provider — Anthropic API direct, via Vertex AI / Bedrock, or Kimi
  // (Moonshot AI, whose upstream speaks the Anthropic Messages API too).
  // Without providers it shows the Anthropic API config.
  const claudeProvider = !provider
    ? "anthropic"
    : CLAUDE_BACKEND[provider.catalogId] ??
      (provider.api === "anthropic" ? "anthropic" : undefined);
  // Kimi's Claude Code and CLI configs pin every model slot to one model.
  const kimiModel =
    (provider?.catalogId === "kimi_api" && chosenModel) || "kimi-k3";
  // Codex speaks the OpenAI shape only, so it takes no model from another.
  const codexModel = api === "openai" ? model : undefined;
  // Every tab but Claude Code needs a fixed request path, which Bedrock and
  // Vertex don't have.
  const pathNote = (
    <SmallParagraph>
      {provider?.name} routes requests by URL path, which only Claude Code
      supports. Pick another provider above to configure this tool.
    </SmallParagraph>
  );

  return (
    <div className={className}>
      {provider && (
        <div className={cn(contentClassName, "flex flex-wrap gap-3 mb-2")}>
          <SelectDropdown
            value={provider.name}
            onChange={(name) => setPick({ name })}
            options={providers.map((p) => ({
              label: p.name,
              value: p.name,
              icon: providerIcon(p.catalogId as AIProviderId),
            }))}
            showValues={false}
            className={"!w-auto min-w-[160px]"}
          />
          {/* A provider that lets any model through lists none, so its model
              is typed instead. */}
          {provider.models.length > 0 ? (
            <SelectDropdown
              value={model}
              onChange={(m) => setPick({ ...pick, model: m })}
              options={provider.models.map((m) => ({ label: m, value: m }))}
              showSearch={provider.models.length > 8}
              showValues={false}
              className={"!w-auto min-w-[160px]"}
            />
          ) : (
            <Input
              aria-label={"Model"}
              placeholder={DEFAULT_MODEL[api]}
              value={pick.model ?? ""}
              onChange={(e) => setPick({ ...pick, model: e.target.value })}
              maxWidthClass={"max-w-[240px]"}
            />
          )}
        </div>
      )}

      <Tabs key={defaultTab} defaultValue={defaultTab}>
        <TabsList justify={"start"} className={listClassName}>
          <TabsTrigger value={"claude-code"}>
            <ClaudeIcon className={TAB_ICON} size={14} />
            Claude Code
          </TabsTrigger>
          <TabsTrigger value={"codex"}>
            <OpenAIIcon className={TAB_ICON} size={14} />
            Codex
          </TabsTrigger>
          <TabsTrigger value={"opencode"}>
            <ShellIcon className={TAB_ICON} size={14} />
            OpenCode
          </TabsTrigger>
          <TabsTrigger value={"pi"}>
            <ShellIcon className={TAB_ICON} size={14} />
            Pi
          </TabsTrigger>
          {hasKimi && (
            <TabsTrigger value={"kimi-cli"}>
              <KimiIcon className={TAB_ICON} size={14} />
              Kimi CLI
            </TabsTrigger>
          )}
          <TabsTrigger value={"sdk"}>
            {picked.api === "anthropic" ? (
              <>
                <ClaudeIcon className={TAB_ICON} size={14} />
                Anthropic SDK
              </>
            ) : (
              <>
                <OpenAIIcon className={TAB_ICON} size={14} />
                OpenAI SDK
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value={"curl"}>
            <ShellIcon className={TAB_ICON} size={14} />
            cURL
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"claude-code"}>
          <div className={contentClassName}>
            {!claudeProvider && (
              <SmallParagraph>
                Claude Code speaks the Anthropic Messages API, which{" "}
                {provider?.name} doesn&apos;t. Pick an Anthropic, Vertex AI,
                Bedrock or Kimi provider above.
              </SmallParagraph>
            )}

            {claudeProvider === "anthropic" && (
              <>
                <Snippet
                  title={
                    claudeMode === "config" ? (
                      <>
                        Add to <ConfigPath path={"~/.claude/settings.json"} />
                      </>
                    ) : (
                      "Run in your shell"
                    )
                  }
                  action={
                    <ModeSwitch value={claudeMode} onChange={setClaudeMode} />
                  }
                  lines={
                    claudeMode === "config"
                      ? [
                          `{`,
                          `  "apiKeyHelper": "echo '-'",`,
                          ...(chosenModel
                            ? [`  "model": "${chosenModel}",`]
                            : []),
                          `  "env": {`,
                          `    "ANTHROPIC_BASE_URL": "${baseUrl}"`,
                          `  }`,
                          `}`,
                        ]
                      : [
                          `export ANTHROPIC_BASE_URL=${baseUrl}`,
                          `export ANTHROPIC_API_KEY=none`,
                          ...(chosenModel
                            ? [`export ANTHROPIC_MODEL=${chosenModel}`]
                            : []),
                          `claude`,
                        ]
                  }
                />
              </>
            )}

            {claudeProvider === "vertex" && (
              <Snippet
                title={
                  <>
                    Add to <ConfigPath path={"~/.claude/settings.json"} />
                  </>
                }
                lines={[
                  `{`,
                  `  "env": {`,
                  `    "CLOUD_ML_REGION": "global",`,
                  `    "ANTHROPIC_VERTEX_PROJECT_ID": "<your-gcp-project-id>",`,
                  `    "CLAUDE_CODE_USE_VERTEX": "1",`,
                  `    "CLAUDE_CODE_SKIP_VERTEX_AUTH": "1",`,
                  ...(chosenModel
                    ? [`    "ANTHROPIC_MODEL": "${chosenModel}",`]
                    : []),
                  `    "ANTHROPIC_VERTEX_BASE_URL": "${baseUrl}/v1"`,
                  `  }`,
                  `}`,
                ]}
              />
            )}

            {claudeProvider === "bedrock" && (
              <Snippet
                title={
                  <>
                    Add to <ConfigPath path={"~/.claude/settings.json"} />
                  </>
                }
                lines={[
                  `{`,
                  `  "env": {`,
                  `    "ANTHROPIC_BEDROCK_BASE_URL": "${baseUrl}/bedrock",`,
                  `    "CLAUDE_CODE_USE_BEDROCK": "1",`,
                  ...(chosenModel
                    ? [`    "ANTHROPIC_MODEL": "${chosenModel}",`]
                    : []),
                  `    "CLAUDE_CODE_SKIP_BEDROCK_AUTH": "1"`,
                  `  }`,
                  `}`,
                ]}
              />
            )}

            {claudeProvider === "kimi" && (
              <>
                <Snippet
                  title={
                    claudeMode === "config" ? (
                      <>
                        Add to <ConfigPath path={"~/.claude/settings.json"} />
                      </>
                    ) : (
                      "Run in your shell"
                    )
                  }
                  action={
                    <ModeSwitch value={claudeMode} onChange={setClaudeMode} />
                  }
                  // Claude Code speaks the Anthropic Messages API, which
                  // Moonshot serves under the /anthropic path prefix. The
                  // prefix goes in the agent's base URL and rides through the
                  // endpoint to the bare https://api.moonshot.ai upstream, so
                  // one Kimi provider serves both API shapes. Every model slot
                  // Claude Code fills on its own (opus/sonnet/haiku tiers,
                  // subagents) is pinned to one Kimi model so no Claude model names
                  // leak into requests the upstream can't serve, and tool
                  // search is off because Moonshot rejects its tool_reference
                  // blocks — both per Moonshot's Claude Code guide.
                  lines={
                    claudeMode === "config"
                      ? [
                          `{`,
                          `  "apiKeyHelper": "echo '-'",`,
                          `  "env": {`,
                          `    "ANTHROPIC_BASE_URL": "${baseUrl}/anthropic",`,
                          `    "ANTHROPIC_MODEL": "${kimiModel}",`,
                          `    "ANTHROPIC_DEFAULT_OPUS_MODEL": "${kimiModel}",`,
                          `    "ANTHROPIC_DEFAULT_SONNET_MODEL": "${kimiModel}",`,
                          `    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "${kimiModel}",`,
                          `    "CLAUDE_CODE_SUBAGENT_MODEL": "${kimiModel}",`,
                          `    "ENABLE_TOOL_SEARCH": "false"`,
                          `  }`,
                          `}`,
                        ]
                      : [
                          `export ANTHROPIC_BASE_URL=${baseUrl}/anthropic`,
                          `export ANTHROPIC_API_KEY=none`,
                          `export ANTHROPIC_MODEL=${kimiModel}`,
                          `export ANTHROPIC_DEFAULT_OPUS_MODEL=${kimiModel}`,
                          `export ANTHROPIC_DEFAULT_SONNET_MODEL=${kimiModel}`,
                          `export ANTHROPIC_DEFAULT_HAIKU_MODEL=${kimiModel}`,
                          `export CLAUDE_CODE_SUBAGENT_MODEL=${kimiModel}`,
                          `export ENABLE_TOOL_SEARCH=false`,
                          `claude`,
                        ]
                  }
                />
                <SmallParagraph className={"mt-3"}>
                  Pairs with a Kimi provider keeping the default upstream URL{" "}
                  <code className={"font-mono"}>https://api.moonshot.ai</code>.
                  The <code className={"font-mono"}>/anthropic</code> suffix in
                  the base URL rides through the endpoint to Moonshot, which
                  serves the Anthropic Messages API under that path.
                </SmallParagraph>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value={"codex"}>
          <div className={contentClassName}>
            {pathRouted ? (
              pathNote
            ) : (
              <>
                <Snippet
                  title={
                    <>
                      Add to <ConfigPath path={"~/.codex/config.toml"} />
                    </>
                  }
                  lines={[
                    ...(codexModel ? [`model = "${codexModel}"`] : []),
                    `model_provider = "netbird"`,
                    ``,
                    `[model_providers.netbird]`,
                    `name = "NetBird"`,
                    `base_url = "${openaiBase}"`,
                    `wire_api = "responses"`,
                  ]}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value={"opencode"}>
          <div className={contentClassName}>
            {pathRouted ? (
              pathNote
            ) : (
              <>
                <Snippet
                  title={
                    <>
                      Add to{" "}
                      <ConfigPath path={"~/.config/opencode/opencode.json"} />
                    </>
                  }
                  lines={openCodeLines(picked, baseUrl)}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value={"pi"}>
          <div className={cn(contentClassName, "flex flex-col gap-3")}>
            {pathRouted ? (
              pathNote
            ) : (
              <>
                <Snippet
                  title={
                    <>
                      Add to <ConfigPath path={"~/.pi/agent/models.json"} />
                    </>
                  }
                  lines={piModelsLines(picked, baseUrl)}
                />
                <Snippet
                  title={
                    <>
                      Add to <ConfigPath path={"~/.pi/agent/settings.json"} />
                    </>
                  }
                  lines={json({
                    defaultProvider: "netbird",
                    defaultModel: model,
                  })}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value={"kimi-cli"}>
          <div className={contentClassName} hidden={!hasKimi}>
            <Snippet
              // Kimi CLI reads providers from ~/.kimi/config.toml. Unlike
              // Claude Code, its "anthropic" provider type needs the bare
              // endpoint — no /anthropic prefix in base_url; api_key is a
              // placeholder since NetBird injects the real key server-side.
              title={
                <>
                  Add to <ConfigPath path={"~/.kimi/config.toml"} />
                </>
              }
              lines={[
                `default_model = "${kimiModel}"`,
                ``,
                `[providers.netbird]`,
                `type = "anthropic"`,
                `base_url = "${baseUrl}"`,
                `api_key = "-"`,
                ``,
                `[models."${kimiModel}"]`,
                `provider = "netbird"`,
                `model = "${kimiModel}"`,
                `max_context_size = 1000000`,
              ]}
            />
            <SmallParagraph className={"mt-3"}>
              Pairs with a Kimi provider keeping the default upstream URL{" "}
              <code className={"font-mono"}>https://api.moonshot.ai</code>. For
              the OpenAI shape instead, use{" "}
              <code className={"font-mono"}>
                type = &quot;openai_legacy&quot;
              </code>{" "}
              with{" "}
              <code className={"font-mono"}>
                base_url = &quot;{openaiBase}&quot;
              </code>
              .
            </SmallParagraph>
          </div>
        </TabsContent>

        <TabsContent value={"sdk"}>
          <div className={contentClassName}>
            {pathRouted ? (
              pathNote
            ) : (
              <>
                <Snippet lines={sdkLines(picked, baseUrl)} />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value={"curl"}>
          <div className={contentClassName}>
            {pathRouted ? (
              pathNote
            ) : (
              <>
                <Snippet {...curlSnippet(picked, baseUrl)} />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
