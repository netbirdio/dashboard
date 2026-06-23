import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import {
  AlertOctagon,
  BracesIcon,
  CogIcon,
  ExternalLinkIcon,
  FileCode2Icon,
  Repeat,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/generic-http.png";
import { useDialog } from "@/contexts/DialogProvider";
import { EventStream } from "@/interfaces/EventStream";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { useWebhookConfig } from "@/cloud/webhooks/useWebhookConfig";
import { WebhookGeneralTabContent } from "@/cloud/webhooks/WebhookGeneralTabContent";
import { WebhookHeadersTabContent } from "@/cloud/webhooks/WebhookHeadersTabContent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  stream?: EventStream;
};

export default function GenericHTTPModal({
  open,
  onOpenChange,
  onSuccess,
  stream,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <GenericHTTPModalContent
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
          onDelete={() => onOpenChange(false)}
          stream={stream}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess?: () => void;
  onDelete?: () => void;
  stream?: EventStream;
};

export const genericHttpBodyTemplatePlaceholder = `{
  "id": "{{.ID}}",
  "timestamp": "{{.Timestamp.Format "2006-01-02T15:04:05.999Z07:00"}}",
  "message": "{{.Message}}",
  "initiator_id": "{{.InitiatorID}}",
  "target_id": "{{.TargetID}}",
  "meta": "{{.Meta}}"
}`;

function parseHeadersFromStream(
  stream?: EventStream,
): Record<string, string> | undefined {
  if (!stream?.config?.headers) return undefined;
  try {
    return JSON.parse(String(stream.config.headers));
  } catch {
    return undefined;
  }
}

export function GenericHTTPModalContent({
  onSuccess,
  onDelete,
  stream,
}: Readonly<ModalProps>) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const integrationRequest = useApiCall("/integrations/event-streaming", true);

  const config = useWebhookConfig({
    initialUrl: stream?.config?.url,
    initialHeaders: parseHeadersFromStream(stream),
  });

  const [tab, setTab] = useState("general");
  const modalWidth = useMemo(
    () => (tab === "general" ? "max-w-xl" : "max-w-2xl"),
    [tab],
  );
  const goBack = () => {
    switch (tab) {
      case "headers":
        setTab("general");
        break;
      case "template":
        setTab("headers");
        break;
      default:
        setTab("general");
        break;
    }
  };

  const [bodyTemplate, setBodyTemplate] = useState(
    stream?.config?.body_template || genericHttpBodyTemplatePlaceholder,
  );
  const [customBodyTemplate, setCustomBodyTemplate] = useState(
    !!stream?.config?.body_template || false,
  );

  const formatHeadersForApi = () => {
    return JSON.stringify(config.formatHeaders());
  };

  const connect = async () => {
    const payload = {
      platform: "generic_http",
      enabled: true,
      config: {
        url: config.url,
        headers: formatHeadersForApi(),
        body_template: customBodyTemplate ? bodyTemplate : undefined,
      },
    };

    notify({
      title: "Generic HTTP Integration",
      description: "HTTP Integration was successfully connected.",
      loadingMessage: "Setting up HTTP integration...",
      promise: integrationRequest.post(payload).then(() => {
        mutate("/integrations/event-streaming");
        onSuccess && onSuccess();
      }),
    });
  };

  const update = async () => {
    if (!stream) return;
    const headers = formatHeadersForApi();

    const payload = {
      enabled: stream?.enabled || true,
      config: {
        url: config.url,
        headers,
        body_template: customBodyTemplate ? bodyTemplate : undefined,
      },
    };

    notify({
      title: "Generic HTTP Integration",
      description: "HTTP Integration was updated successfully.",
      loadingMessage: "Updating HTTP integration...",
      promise: integrationRequest.put(payload, `/${stream?.id}`).then(() => {
        mutate("/integrations/event-streaming");
        onSuccess && onSuccess();
      }),
    });
  };

  const deleteIntegration = async () => {
    if (!stream) return;
    const choice = await confirm({
      title: `Delete Generic HTTP Integration?`,
      description:
        "Are you sure you want to delete this integration? You will need to start the setup process again.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      maxWidthClass: "max-w-lg",
    });
    if (!choice) return;

    notify({
      title: "Generic HTTP Integration",
      description: `Generic HTTP was successfully deleted`,
      promise: integrationRequest.del({}, "/" + stream.id).then(() => {
        onDelete?.();
        mutate("/integrations/event-streaming");
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const canContinueToBodyTemplate = useMemo(() => {
    if (config.authHeaderConflict) return false;
    return !config.headerError;
  }, [config.headerError, config.authHeaderConflict]);

  const canCreateOrUpdate = config.canContinueToHeaders && canContinueToBodyTemplate;

  return (
    <ModalContent
      maxWidthClass={modalWidth}
      onEscapeKeyDown={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
    >
      <GradientFadedBackground />

      <IntegrationModalHeader
        image={integrationImage}
        title={
          stream
            ? "Generic HTTP Configuration"
            : "Connect NetBird with Generic HTTP"
        }
        description={`Start streaming your NetBird audit & traffic events to a Generic HTTP endpoint. ${
          stream ? "" : "Follow the steps to get started."
        }`}
      />

      <Tabs
        defaultValue={tab}
        value={tab}
        onValueChange={(v) => setTab(v)}
        className={"mt-6"}
      >
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"general"}>
            <CogIcon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            General
          </TabsTrigger>
          <TabsTrigger value={"headers"} disabled={!config.canContinueToHeaders}>
            <FileCode2Icon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Headers
          </TabsTrigger>
          <TabsTrigger
            value={"template"}
            disabled={!canContinueToBodyTemplate || !config.canContinueToHeaders}
          >
            <BracesIcon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Body Template
          </TabsTrigger>
          {stream && (
            <TabsTrigger value={"danger"}>
              <AlertOctagon
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Danger Zone
            </TabsTrigger>
          )}
        </TabsList>
        <WebhookGeneralTabContent
          value={config}
          urlHelpText="Full HTTP(S) URL where events will be sent later via a POST request."
          mask={!!stream}
        />
        <WebhookHeadersTabContent value={config} />

        <TabsContent value={"template"} className={"px-8"}>
          <FancyToggleSwitch
            value={customBodyTemplate}
            onChange={setCustomBodyTemplate}
            label={
              <>
                <BracesIcon size={15} />
                Custom Body Template (optional)
              </>
            }
            helpText={
              "Customize the request body template for your events. Build your own in plain text or JSON format."
            }
          />
          {customBodyTemplate && (
            <>
              <Textarea
                value={bodyTemplate}
                placeholder={genericHttpBodyTemplatePlaceholder}
                resize={false}
                className={"w-full my-4 overflow-y-auto resize-y"}
                rows={8}
                onChange={(e) => setBodyTemplate(e.target.value)}
              />
              <HelpText>
                There are various variables available to structure the body
                template. Please refer to the documentation for more details on
                how to use them.
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/stream-activity-to-generic-http#custom-body-template-optional"
                  }
                  className={"relative top-[0px] ml-1"}
                >
                  Body Template Variables
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </HelpText>
            </>
          )}
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <div>
            <Label>
              <div className={"flex gap-2 items-center"}>
                <AlertOctagon size={16} />
                Delete Integration
              </div>
            </Label>
            <HelpText className={"max-w-lg mt-2"}>
              Deleting this integration will remove the ability to stream
              events. If you delete the integration you will need to reconfigure
              it again to enable event streaming.
            </HelpText>
          </div>
          <Button
            variant={"danger"}
            size={"xs"}
            className={"mt-3"}
            onClick={deleteIntegration}
          >
            Delete Integration
          </Button>
        </TabsContent>
      </Tabs>

      <div className={"h-6"}></div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/stream-activity-to-generic-http"
              }
              target={"_blank"}
            >
              Generic HTTP Streaming
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {tab === "general" && !stream && (
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
          )}
          {tab !== "general" && !stream && (
            <Button variant={"secondary"} onClick={goBack}>
              Back
            </Button>
          )}
          {tab === "general" && !stream && (
            <Button
              variant={"primary"}
              disabled={!config.canContinueToHeaders}
              onClick={() => setTab("headers")}
            >
              Continue
              <IconArrowRight size={16} />
            </Button>
          )}
          {tab === "headers" && !stream && (
            <Button
              variant={"primary"}
              disabled={!config.canContinueToHeaders || !canContinueToBodyTemplate}
              onClick={() => setTab("template")}
            >
              Continue
              <IconArrowRight size={16} />
            </Button>
          )}
          {tab === "template" && !stream && (
            <Button
              variant={"primary"}
              className={"w-full"}
              disabled={!canCreateOrUpdate}
              onClick={connect}
            >
              <Repeat size={16} />
              Connect
            </Button>
          )}

          {stream && (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={update}
                disabled={!canCreateOrUpdate}
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
