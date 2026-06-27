"use client";

import Code from "@components/Code";
import { Modal, ModalContent } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import SquareIcon from "@components/SquareIcon";
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
}: {
  endpoint: string;
  listClassName?: string;
  contentClassName?: string;
  // Which tab opens first. Callers that know the connected provider pass the
  // matching tool (e.g. Anthropic → claude-code, OpenAI → curl). Keyed below
  // so a late-resolving defaultTab still re-initialises the tabs.
  defaultTab?: string;
}) {
  const baseUrl = `https://${endpoint}`;
  const openaiBase = `${baseUrl}/v1`;
  const [claudeMode, setClaudeMode] = React.useState<"config" | "shell">(
    "config",
  );

  return (
    <Tabs key={defaultTab} defaultValue={defaultTab} className={"mt-2"}>
      <TabsList justify={"start"} className={listClassName}>
        <TabsTrigger value={"claude-code"}>Claude Code</TabsTrigger>
        <TabsTrigger value={"codex"}>Codex</TabsTrigger>
        <TabsTrigger value={"openai-sdk"}>OpenAI SDK</TabsTrigger>
        <TabsTrigger value={"curl"}>cURL</TabsTrigger>
      </TabsList>

      <TabsContent value={"claude-code"}>
        <div className={contentClassName}>
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

        <AgentConnectTabs endpoint={endpoint} />
      </ModalContent>
    </Modal>
  );
}
