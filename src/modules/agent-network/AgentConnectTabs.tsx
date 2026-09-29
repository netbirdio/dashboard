"use client";

import Code from "@components/Code";
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
import { AIProviderId } from "@/modules/agent-network/data/mockData";

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

// AgentConnectTabs renders the per-tool connect snippets (Claude Code, Codex,
// OpenAI SDK, cURL) for a given endpoint. Rendered inline wherever the config
// belongs — the Connect Agent page and the onboarding "Configure your agent"
// step. listClassName / contentClassName let the caller tune horizontal
// padding, since each host sits in a different gutter.
export function AgentConnectTabs({
  endpoint,
  className = "mt-2",
  listClassName = "px-8",
  contentClassName = "px-6 py-2",
  defaultTab = "claude-code",
  providerIds = [],
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
  // Catalog ids of the account's connected providers. Kimi-specific config
  // surfaces (the Kimi CLI tab and the Kimi variant inside the Claude Code
  // tab) only render when a kimi_api provider is actually connected —
  // showing Moonshot setup against an endpoint that can't route to Kimi
  // would just be a trap.
  providerIds?: string[];
}) {
  const baseUrl = `https://${endpoint}`;
  const openaiBase = `${baseUrl}/v1`;
  const hasKimi = providerIds.includes("kimi_api");
  const [claudeMode, setClaudeMode] = React.useState<ClaudeMode>("config");
  // Which backend the Claude Code config targets — Anthropic API direct,
  // via Vertex AI / Bedrock, or Kimi (Moonshot AI, whose upstream speaks the
  // Anthropic Messages API too). Switched in-tab instead of separate tabs.
  // When Kimi is the only Anthropic-shaped provider connected, it's the only
  // config that can work, so start there.
  const kimiOnlyAnthropicShape =
    hasKimi &&
    !["anthropic_api", "vertex_ai_api", "bedrock_api"].some((id) =>
      providerIds.includes(id),
    );
  const [claudeProvider, setClaudeProvider] = React.useState<
    "anthropic" | "vertex" | "bedrock" | "kimi"
  >(kimiOnlyAnthropicShape ? "kimi" : "anthropic");

  return (
    <Tabs key={defaultTab} defaultValue={defaultTab} className={className}>
      <TabsList justify={"start"} className={listClassName}>
        <TabsTrigger value={"claude-code"}>
          <ClaudeIcon className={TAB_ICON} size={14} />
          Claude Code
        </TabsTrigger>
        <TabsTrigger value={"codex"}>
          <OpenAIIcon className={TAB_ICON} size={14} />
          Codex
        </TabsTrigger>
        {hasKimi && (
          <TabsTrigger value={"kimi-cli"}>
            <KimiIcon className={TAB_ICON} size={14} />
            Kimi CLI
          </TabsTrigger>
        )}
        <TabsTrigger value={"openai-sdk"}>
          <OpenAIIcon className={TAB_ICON} size={14} />
          OpenAI SDK
        </TabsTrigger>
        <TabsTrigger value={"curl"}>
          <ShellIcon className={TAB_ICON} size={14} />
          cURL
        </TabsTrigger>
      </TabsList>

      <TabsContent value={"claude-code"}>
        <div className={contentClassName}>
          <div className={"mb-5"}>
            <SelectDropdown
              value={claudeProvider}
              onChange={(v) =>
                setClaudeProvider(
                  v as "anthropic" | "vertex" | "bedrock" | "kimi",
                )
              }
              options={[
                {
                  label: "Anthropic API",
                  value: "anthropic",
                  icon: providerIcon("anthropic_api"),
                },
                {
                  label: "Vertex AI",
                  value: "vertex",
                  icon: providerIcon("vertex_ai_api"),
                },
                {
                  label: "Bedrock",
                  value: "bedrock",
                  icon: providerIcon("bedrock_api"),
                },
                ...(hasKimi
                  ? [
                      {
                        label: "Kimi (Moonshot AI)",
                        value: "kimi",
                        icon: providerIcon("kimi_api"),
                      },
                    ]
                  : []),
              ]}
              showValues={false}
              className={"!w-auto min-w-[160px]"}
            />
          </div>

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
                        `  "env": {`,
                        `    "ANTHROPIC_BASE_URL": "${baseUrl}"`,
                        `  }`,
                        `}`,
                      ]
                    : [
                        `export ANTHROPIC_BASE_URL=${baseUrl}`,
                        `export ANTHROPIC_API_KEY=none`,
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
                // subagents) is pinned to kimi-k3 so no Claude model names
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
                        `    "ANTHROPIC_MODEL": "kimi-k3",`,
                        `    "ANTHROPIC_DEFAULT_OPUS_MODEL": "kimi-k3",`,
                        `    "ANTHROPIC_DEFAULT_SONNET_MODEL": "kimi-k3",`,
                        `    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "kimi-k3",`,
                        `    "CLAUDE_CODE_SUBAGENT_MODEL": "kimi-k3",`,
                        `    "ENABLE_TOOL_SEARCH": "false"`,
                        `  }`,
                        `}`,
                      ]
                    : [
                        `export ANTHROPIC_BASE_URL=${baseUrl}/anthropic`,
                        `export ANTHROPIC_API_KEY=none`,
                        `export ANTHROPIC_MODEL=kimi-k3`,
                        `export ANTHROPIC_DEFAULT_OPUS_MODEL=kimi-k3`,
                        `export ANTHROPIC_DEFAULT_SONNET_MODEL=kimi-k3`,
                        `export ANTHROPIC_DEFAULT_HAIKU_MODEL=kimi-k3`,
                        `export CLAUDE_CODE_SUBAGENT_MODEL=kimi-k3`,
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
          <Snippet
            title={
              <>
                Add to <ConfigPath path={"~/.codex/config.toml"} />
              </>
            }
            lines={[
              `model_provider = "netbird"`,
              ``,
              `[model_providers.netbird]`,
              `name = "NetBird"`,
              `base_url = "${openaiBase}"`,
              `wire_api = "responses"`,
            ]}
          />
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
              `default_model = "kimi-k3"`,
              ``,
              `[providers.netbird]`,
              `type = "anthropic"`,
              `base_url = "${baseUrl}"`,
              `api_key = "-"`,
              ``,
              `[models.kimi-k3]`,
              `provider = "netbird"`,
              `model = "kimi-k3"`,
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

      <TabsContent value={"openai-sdk"}>
        <div className={contentClassName}>
          <Snippet
            lines={[
              `from openai import OpenAI`,
              ``,
              `client = OpenAI(`,
              `    base_url="${openaiBase}",`,
              `    api_key="not-needed",`,
              `)`,
              ``,
              `client.chat.completions.create(`,
              `    model="gpt-5.5",`,
              `    messages=[{"role": "user", "content": "What is NetBird Agent Network?"}],`,
              `)`,
            ]}
          />
        </div>
      </TabsContent>

      <TabsContent value={"curl"}>
        <div className={contentClassName}>
          <Snippet
            // Displayed with the JSON pretty-printed (curl accepts multi-line
            // single-quoted bodies); copyText is the compact one-line command.
            lines={[
              `curl ${openaiBase}/chat/completions \\`,
              `  -H "Content-Type: application/json" \\`,
              `  -d '{`,
              `    "model": "gpt-5.5",`,
              `    "messages": [`,
              `      { "role": "user", "content": "What is NetBird Agent Network?" }`,
              `    ]`,
              `  }'`,
            ]}
            copyText={`curl ${openaiBase}/chat/completions -H "Content-Type: application/json" -d '{"model":"gpt-5.5","messages":[{"role":"user","content":"What is NetBird Agent Network?"}]}'`}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
