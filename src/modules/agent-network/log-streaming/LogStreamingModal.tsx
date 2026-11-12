import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
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
import { notify } from "@components/Notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useApiCall } from "@utils/api";
import {
  AlertOctagon,
  CogIcon,
  FileCode2Icon,
  KeyRoundIcon,
  ServerIcon,
  SlidersHorizontalIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useWebhookConfig } from "@/cloud/webhooks/useWebhookConfig";
import { AuthenticationSettings } from "@/cloud/webhooks/WebhookAuthenticationSettings";
import { WebhookGeneralTabContent } from "@/cloud/webhooks/WebhookGeneralTabContent";
import { WebhookHeadersTabContent } from "@/cloud/webhooks/WebhookHeadersTabContent";
import { useDialog } from "@/contexts/DialogProvider";
import {
  ADVANCED_FIELDS,
  buildLogStreamingConfig,
  LOG_STREAMING_URL,
  LogStreamingIntegration,
  LogStreamingPlatform,
  otlpEndpointError,
  parseLogStreamingHeaders,
} from "@/modules/agent-network/log-streaming/logStreaming";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";

export const PLATFORM_NAMES: Record<LogStreamingPlatform, string> = {
  http: "HTTP",
  otlp_grpc: "OTLP/gRPC",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: LogStreamingPlatform;
  image: React.ComponentProps<typeof IntegrationModalHeader>["image"];
  integration?: LogStreamingIntegration;
  canDelete: boolean;
};

export default function LogStreamingModal({
  open,
  onOpenChange,
  ...props
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <LogStreamingModalContent
          {...props}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Modal>
  );
}

function LogStreamingModalContent({
  platform,
  image,
  integration,
  canDelete,
  onDone,
}: Omit<Props, "open" | "onOpenChange"> & { onDone: () => void }) {
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  // Errors are shown in the toast: a 412 here means the test delivery was
  // rejected, which must not raise the page error boundary.
  const request = useApiCall<LogStreamingIntegration>(LOG_STREAMING_URL, true);
  const name = `${PLATFORM_NAMES[platform]} Log Streaming`;
  const editing = !!integration;
  const isHttp = platform === "http";

  const webhook = useWebhookConfig({
    initialUrl: integration?.config.url,
    initialHeaders: parseLogStreamingHeaders(integration?.config.headers),
    requireUrl: isHttp,
  });
  const [values, setValues] = useState<Record<string, string>>(
    integration?.config ?? {},
  );
  const set = (key: string) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  const field = (key: string) => ({
    value: values[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(key)(e.target.value),
  });

  const endpointError = otlpEndpointError(values.endpoint ?? "");
  const canSave =
    webhook.canSave && (isHttp || (!!values.endpoint && endpointError === ""));
  const [tab, setTab] = useState("general");

  const save = () => {
    const config = buildLogStreamingConfig(
      platform,
      { ...values, url: webhook.url },
      webhook.formatHeaders(),
      editing,
    );
    const promise = editing
      ? request.put(
          // Always send enabled: the API treats a missing value as false.
          { enabled: integration.enabled, config },
          `/${integration.id}`,
        )
      : request.post({ platform, config });
    notify({
      title: name,
      description: editing
        ? "Log streaming was updated."
        : "Log streaming was connected and a test entry was delivered.",
      loadingMessage: editing
        ? "Updating log streaming..."
        : "Sending a test entry...",
      promise: promise.then(() => {
        mutate(LOG_STREAMING_URL);
        onDone();
      }),
    });
  };

  const remove = async () => {
    if (!integration) return;
    const choice = await confirm({
      title: `Delete ${name}?`,
      description:
        "Access logs will no longer be streamed to this endpoint. You will need to set it up again to resume streaming.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      maxWidthClass: "max-w-lg",
    });
    if (!choice) return;
    notify({
      title: name,
      description: "Log streaming was deleted.",
      loadingMessage: "Deleting log streaming...",
      promise: request.del({}, `/${integration.id}`).then(() => {
        mutate(LOG_STREAMING_URL);
        onDone();
      }),
    });
  };

  const iconClass =
    "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all";

  return (
    <ModalContent
      maxWidthClass={"max-w-2xl"}
      onEscapeKeyDown={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
    >
      <GradientFadedBackground />
      <IntegrationModalHeader
        image={image}
        title={editing ? `${name} Configuration` : `Connect ${name}`}
        description={
          isHttp
            ? "Stream Agent Network access logs as JSON batches to your HTTP endpoint."
            : "Stream Agent Network access logs to an OpenTelemetry Collector or any OTLP/gRPC log backend."
        }
      />

      <Tabs value={tab} onValueChange={setTab} className={"mt-6"}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"general"}>
            <CogIcon size={16} className={iconClass} />
            General
          </TabsTrigger>
          <TabsTrigger value={"headers"}>
            <FileCode2Icon size={16} className={iconClass} />
            {isHttp ? "Headers" : "Metadata"}
          </TabsTrigger>
          <TabsTrigger
            value={"options"}
            data-testid={"log-streaming-tab-options"}
          >
            <SlidersHorizontalIcon size={16} className={iconClass} />
            Options
          </TabsTrigger>
          {editing && canDelete && (
            <TabsTrigger
              value={"danger"}
              data-testid={"log-streaming-tab-danger"}
            >
              <AlertOctagon size={16} className={iconClass} />
              Danger Zone
            </TabsTrigger>
          )}
        </TabsList>

        {isHttp ? (
          <WebhookGeneralTabContent
            value={webhook}
            urlHelpText={
              "Full HTTP(S) URL that receives batches of access logs via POST."
            }
            mask={editing}
          />
        ) : (
          <TabsContent value={"general"} className={"px-8 text-sm"}>
            <div className={"mb-6"}>
              <Label>Endpoint</Label>
              <HelpText>
                The collector&apos;s gRPC address as host:port, without a
                scheme.
              </HelpText>
              <Input
                customPrefix={<ServerIcon size={16} />}
                placeholder={"otel-collector.internal:4317"}
                maxWidthClass={"w-full"}
                error={endpointError}
                data-testid={"log-streaming-endpoint"}
                {...field("endpoint")}
              />
            </div>
            <FancyToggleSwitch
              value={values.insecure === "true"}
              onChange={(on) => set("insecure")(on ? "true" : "")}
              label={"Plaintext connection (insecure)"}
              helpText={
                "Connect without TLS. Only use this inside a trusted network."
              }
              className={"mb-6"}
            />
            <Label>Authentication</Label>
            <HelpText>
              Sent as gRPC metadata with every export request.
            </HelpText>
            <AuthenticationSettings value={webhook} mask={editing} />
          </TabsContent>
        )}

        <WebhookHeadersTabContent value={webhook} />

        <TabsContent value={"options"} className={"px-8 text-sm"}>
          <FancyToggleSwitch
            value={values.enrich_user_info === "true"}
            onChange={(on) => set("enrich_user_info")(on ? "true" : "")}
            label={
              <>
                <UserIcon size={15} />
                Include user details
              </>
            }
            helpText={
              "Add the user's name, email and group memberships to each entry."
            }
          />
          {isHttp ? (
            <div className={"mt-6"}>
              <Label>Signing secret (optional)</Label>
              <HelpText>
                Signs each request with Standard Webhooks headers. Use a
                whsec_&lt;base64&gt; value or any string.
              </HelpText>
              <Input
                customPrefix={<KeyRoundIcon size={16} />}
                placeholder={"whsec_..."}
                type={"password"}
                maxWidthClass={"w-full"}
                data-testid={"log-streaming-signing-secret"}
                {...field("signing_secret")}
              />
            </div>
          ) : (
            <div className={"mt-6"}>
              <Label>Service name</Label>
              <HelpText>Set as the OTLP resource&apos;s service.name.</HelpText>
              <Input
                customPrefix={<TagIcon size={16} />}
                placeholder={"netbird-management"}
                maxWidthClass={"w-full"}
                {...field("service_name")}
              />
            </div>
          )}

          <Accordion type={"single"} collapsible className={"mt-6"}>
            <AccordionItem value={"advanced"}>
              <AccordionTrigger>Advanced</AccordionTrigger>
              <AccordionContent>
                <HelpText>
                  Batching and retry limits. Leave a field empty to use the
                  default shown. Durations use units such as 500ms, 5s or 1m.
                </HelpText>
                <div className={"grid grid-cols-2 gap-x-4 gap-y-3 mt-2"}>
                  {ADVANCED_FIELDS.map((f) => (
                    <div key={f.key}>
                      <Label>{f.label}</Label>
                      <Input
                        placeholder={f.placeholder}
                        maxWidthClass={"w-full"}
                        {...field(f.key)}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value={"danger"} className={"px-8"}>
          <Label>
            <div className={"flex gap-2 items-center"}>
              <AlertOctagon size={16} />
              Delete Log Streaming
            </div>
          </Label>
          <HelpText className={"max-w-lg mt-2"}>
            Access logs stop streaming to this endpoint. They are still kept in
            NetBird according to your log collection settings.
          </HelpText>
          <Button
            variant={"danger"}
            size={"xs"}
            className={"mt-3"}
            onClick={remove}
            data-testid={"log-streaming-delete"}
          >
            Delete Log Streaming
          </Button>
        </TabsContent>
      </Tabs>

      <div className={"h-6"} />
      <ModalFooter className={"items-center"}>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            disabled={!canSave}
            onClick={save}
            data-testid={"log-streaming-save"}
          >
            {editing ? "Save Changes" : "Connect"}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
