"use client";

import Code from "@components/Code";
import { Modal, ModalContent } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import SquareIcon from "@components/SquareIcon";
import TabsContentPadding, {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/Tabs";
import { Plug } from "lucide-react";
import * as React from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Bare endpoint host, e.g. "sailcloth.eu.proxy.netbird.io".
  endpoint: string;
};

// Snippet renders a copyable Code block from a list of lines, with an optional
// caption above it. The lines are joined verbatim for the clipboard. Wrapped in
// min-w-0 so its scroll area handles long lines instead of widening the modal.
function Snippet({ caption, lines }: { caption?: string; lines: string[] }) {
  return (
    <div className={"min-w-0"}>
      {caption && <SmallParagraph className={"mb-2"}>{caption}</SmallParagraph>}
      <Code codeToCopy={lines.join("\n")} message={"Copied to clipboard"}>
        {lines.map((line, i) => (
          <Code.Line key={i}>{line}</Code.Line>
        ))}
      </Code>
    </div>
  );
}

export default function AgentConnectModal({
  open,
  onOpenChange,
  endpoint,
}: Readonly<Props>) {
  const baseUrl = `https://${endpoint}`;
  const openaiBase = `${baseUrl}/v1`;
  const [claudeMode, setClaudeMode] = React.useState<"config" | "shell">(
    "config",
  );

  // Always start on the JSON config view each time the modal opens.
  React.useEffect(() => {
    if (open) setClaudeMode("config");
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-2xl"}>
        <div className={"px-8 pt-5"}>
          <div className={"flex items-center gap-3"}>
            <SquareIcon
              color={"netbird"}
              margin={""}
              icon={<Plug size={16} />}
            />
            <h2 className={"text-lg my-0 leading-[1.5]"}>
              Configure Your Agent
            </h2>
          </div>
          <Paragraph className={"text-sm mt-3"}>
            Point your agent at the NetBird endpoint as its base URL. No
            provider API key is needed on the client. NetBird authorizes the
            request against your policies and injects the upstream key.
          </Paragraph>
        </div>

        <Tabs defaultValue={"claude-code"} className={"mt-2"}>
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"claude-code"}>Claude Code</TabsTrigger>
            <TabsTrigger value={"codex"}>Codex</TabsTrigger>
            <TabsTrigger value={"openai-sdk"}>OpenAI SDK</TabsTrigger>
            <TabsTrigger value={"curl"}>cURL</TabsTrigger>
          </TabsList>

          <TabsContent value={"claude-code"}>
            <TabsContentPadding>
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
            </TabsContentPadding>
          </TabsContent>

          <TabsContent value={"codex"}>
            <TabsContentPadding>
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
            </TabsContentPadding>
          </TabsContent>

          <TabsContent value={"openai-sdk"}>
            <TabsContentPadding>
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
                  `    model="gpt-4o",`,
                  `    messages=[{"role": "user", "content": "Hello"}],`,
                  `)`,
                ]}
              />
            </TabsContentPadding>
          </TabsContent>

          <TabsContent value={"curl"}>
            <TabsContentPadding>
              <Snippet
                lines={[
                  `curl ${openaiBase}/chat/completions \\`,
                  `  -H "Content-Type: application/json" \\`,
                  `  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'`,
                ]}
              />
            </TabsContentPadding>
          </TabsContent>
        </Tabs>
      </ModalContent>
    </Modal>
  );
}
