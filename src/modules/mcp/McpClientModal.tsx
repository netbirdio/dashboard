import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import {
  MCP_CLIENTS_DOCS_URL,
  McpClient,
  parseStepText,
} from "@/modules/mcp/mcp";
import McpClientIcon from "@/modules/mcp/McpClientIcon";

type Props = {
  client?: McpClient;
  onClose: () => void;
};

export default function McpClientModal({ client, onClose }: Readonly<Props>) {
  return (
    <Modal open={!!client} onOpenChange={(open) => !open && onClose()}>
      {client && (
        <ModalContent maxWidthClass={"relative max-w-xl"} showClose={true}>
          <GradientFadedBackground />
          <IntegrationModalHeader
            icon={<McpClientIcon client={client.id} size={24} colored={true} />}
            title={`Connect NetBird with ${client.name}`}
            description={
              "The client signs in as you and can only do what your role allows. Follow the steps below to get started."
            }
          />
          <div className={"px-8 py-3 flex flex-col mt-4 z-0 min-w-0"}>
            <Steps>
              {client.steps.map((step, index) => (
                <Steps.Step
                  key={step.text}
                  step={index + 1}
                  line={index < client.steps.length - 1}
                >
                  <p className={"font-normal"}>
                    {parseStepText(step.text).map((part, i) => {
                      if (part.type === "mark" || part.type === "copy") {
                        return (
                          <Mark key={i} copy={part.type === "copy"}>
                            {part.value}
                          </Mark>
                        );
                      }
                      if (part.type === "link") {
                        return (
                          <InlineLink
                            key={i}
                            href={part.href}
                            target={"_blank"}
                          >
                            {part.value}
                            <ExternalLinkIcon size={12} />
                          </InlineLink>
                        );
                      }
                      return part.value;
                    })}
                  </p>
                  {step.code && (
                    <Code codeToCopy={step.code}>
                      <Code.Line>{step.code}</Code.Line>
                    </Code>
                  )}
                </Steps.Step>
              ))}
            </Steps>
          </div>
          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto whitespace-nowrap"}>
                Learn more about
                <InlineLink
                  href={client.docsUrl ?? MCP_CLIENTS_DOCS_URL}
                  target={"_blank"}
                >
                  Connecting {client.name}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <Button variant={"primary"} onClick={onClose}>
                Done
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      )}
    </Modal>
  );
}
