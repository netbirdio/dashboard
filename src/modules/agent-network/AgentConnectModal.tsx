"use client";

import Code from "@components/Code";
import { Modal, ModalContent } from "@components/modal/Modal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import SquareIcon from "@components/SquareIcon";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Plug } from "lucide-react";
import * as React from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Bare endpoint host, e.g. "sailcloth.eu.proxy.netbird.io".
  endpoint: string;
};

// Snippet renders a copyable Code block from a list of lines, with an optional
// caption above it. Wrapped in min-w-0 so its scroll area handles long lines
// instead of widening the modal. By default the displayed lines are what gets
// copied (joined with newlines); pass copyText to copy something different —
// e.g. show a curl command across multiple lines but copy it as one line.
function Snippet({
  caption,
  lines,
  copyText,
}: {
  caption?: string;
  lines: string[];
  copyText?: string;
}) {
  return (
    <div className={"min-w-0"}>
      {caption && <SmallParagraph className={"mb-2"}>{caption}</SmallParagraph>}
      <Code
        codeToCopy={copyText ?? lines.join("\n")}
        message={"Copied to clipboard"}
      >
        {lines.map((line, i) => (
          <Code.Line key={i}>{line}</Code.Line>
        ))}
      </Code>
    </div>
  );
}

// AgentConnectTabs renders the per-tool connect snippets (Claude Code, Codex,
// OpenAI SDK, cURL) for a given endpoint. Extracted so it can be shown both
// inside AgentConnectModal and inline in the onboarding "Configure your agent"
// step. listClassName / contentClassName let the caller tune horizontal
// padding — the modal indents to its gutter, the inline card uses none.
export function AgentConnectTabs({
  endpoint,
  listClassName = "px-8",
  contentClassName = "px-6 py-2",
  defaultTab = "claude-code",
  providerIds = [],
}: {
  endpoint: string;
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
  const [claudeMode, setClaudeMode] = React.useState<"config" | "shell">(
    "config",
  );
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
    <Tabs key={defaultTab} defaultValue={defaultTab} className={"mt-2"}>
      <TabsList justify={"start"} className={listClassName}>
        <TabsTrigger value={"claude-code"}>Claude Code</TabsTrigger>
        <TabsTrigger value={"codex"}>Codex</TabsTrigger>
        {hasKimi && <TabsTrigger value={"kimi-cli"}>Kimi CLI</TabsTrigger>}
        <TabsTrigger value={"openai-sdk"}>OpenAI SDK</TabsTrigger>
        <TabsTrigger value={"curl"}>cURL</TabsTrigger>
      </TabsList>

      <TabsContent value={"claude-code"}>
        <div className={contentClassName}>
          <div className={"mb-3"}>
            <SelectDropdown
              value={claudeProvider}
              onChange={(v) =>
                setClaudeProvider(
                  v as "anthropic" | "vertex" | "bedrock" | "kimi",
                )
              }
              options={[
                { label: "Anthropic API", value: "anthropic" },
                { label: "Vertex AI", value: "vertex" },
                { label: "Bedrock", value: "bedrock" },
                ...(hasKimi
                  ? [{ label: "Kimi (Moonshot AI)", value: "kimi" }]
                  : []),
              ]}
              showValues={false}
              className={"w-[160px]"}
            />
          </div>

          {claudeProvider === "anthropic" && (
            <>
              <div className={"flex items-center justify-between gap-3 mb-2"}>
                <SmallParagraph className={"!mb-0"}>
                  {claudeMode === "config"
                    ? "Add to ~/.claude/settings.json:"
                    : "Run in your shell:"}
                </SmallParagraph>
                <button
                  type={"button"}
                  onClick={() =>
                    setClaudeMode(claudeMode === "config" ? "shell" : "config")
                  }
                  className={
                    "shrink-0 mr-2 text-[11px] text-white hover:underline underline-offset-2 cursor-pointer"
                  }
                >
                  {claudeMode === "config" ? "Shell" : "JSON"}
                </button>
              </div>
              <Snippet
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
              caption={"Add to ~/.claude/settings.json:"}
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
              caption={"Add to ~/.claude/settings.json:"}
              lines={[
                `{`,
                `  "env": {`,
                `    "ANTHROPIC_MODEL": "<your-bedrock-model-id>",`,
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
              <div className={"flex items-center justify-between gap-3 mb-2"}>
                <SmallParagraph className={"!mb-0"}>
                  {claudeMode === "config"
                    ? "Add to ~/.claude/settings.json:"
                    : "Run in your shell:"}
                </SmallParagraph>
                <button
                  type={"button"}
                  onClick={() =>
                    setClaudeMode(claudeMode === "config" ? "shell" : "config")
                  }
                  className={
                    "shrink-0 mr-2 text-[11px] text-white hover:underline underline-offset-2 cursor-pointer"
                  }
                >
                  {claudeMode === "config" ? "Shell" : "JSON"}
                </button>
              </div>
              <Snippet
                // Claude Code speaks the Anthropic Messages API, which
                // Moonshot serves under the /anthropic path prefix — the Kimi
                // provider's upstream URL must be
                // https://api.moonshot.ai/anthropic. Every model slot Claude
                // Code fills on its own (opus/sonnet/haiku tiers, subagents)
                // is pinned to kimi-k3 so no Claude model names leak into
                // requests the upstream can't serve, and tool search is off
                // because Moonshot rejects its tool_reference blocks — both
                // per Moonshot's Claude Code guide.
                lines={
                  claudeMode === "config"
                    ? [
                        `{`,
                        `  "apiKeyHelper": "echo '-'",`,
                        `  "env": {`,
                        `    "ANTHROPIC_BASE_URL": "${baseUrl}",`,
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
                        `export ANTHROPIC_BASE_URL=${baseUrl}`,
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
                Requires the Kimi provider&apos;s upstream URL to be{" "}
                <code className={"font-mono"}>
                  https://api.moonshot.ai/anthropic
                </code>{" "}
                — Moonshot serves the Anthropic Messages API under that path.
              </SmallParagraph>
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value={"codex"}>
        <div className={contentClassName}>
          <Snippet
            caption={"Add to ~/.codex/config.toml:"}
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
            // Kimi CLI reads providers from ~/.kimi/config.toml. The
            // "anthropic" provider type matches a Kimi provider whose
            // upstream URL is https://api.moonshot.ai/anthropic; api_key is
            // a placeholder since NetBird injects the real key server-side.
            caption={"Add to ~/.kimi/config.toml:"}
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
            Pairs with a Kimi provider whose upstream URL is{" "}
            <code className={"font-mono"}>
              https://api.moonshot.ai/anthropic
            </code>
            . For an OpenAI-shaped provider (upstream{" "}
            <code className={"font-mono"}>https://api.moonshot.ai</code>), use{" "}
            <code className={"font-mono"}>type = &quot;openai_legacy&quot;</code>{" "}
            with <code className={"font-mono"}>base_url = &quot;{openaiBase}&quot;</code>{" "}
            instead.
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

export default function AgentConnectModal({
  open,
  onOpenChange,
  endpoint,
}: Readonly<Props>) {
  // Rendered inside <AIProvidersProvider> (providers page); the connected
  // provider ids gate which per-tool config variants the tabs offer.
  const { providers } = useAIProviders();
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-2xl"}>
        <div className={"px-8 pt-5"}>
          <div className={"flex items-center gap-3"}>
            <SquareIcon color={"netbird"} margin={""} icon={<Plug size={16} />} />
            <h2 className={"text-lg my-0 leading-[1.5]"}>Configure Your Agent</h2>
          </div>
          <Paragraph className={"text-sm mt-3"}>
            Point your agent at the NetBird endpoint as its base URL. No provider
            API key is needed on the client. NetBird authorizes the request
            against your policies and injects the upstream key.
          </Paragraph>
        </div>

        <AgentConnectTabs
          endpoint={endpoint}
          providerIds={providers.map((p) => p.providerId)}
        />
      </ModalContent>
    </Modal>
  );
}
