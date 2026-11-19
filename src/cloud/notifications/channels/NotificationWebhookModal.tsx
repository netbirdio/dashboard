import React, { useMemo, useState } from "react";
import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { Tabs, TabsList, TabsTrigger } from "@components/Tabs";
import {
  ExternalLinkIcon,
  FileCode2Icon,
  GlobeIcon,
  Repeat,
  TextIcon,
} from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  NOTIFICATION_CHANNELS_WEBHOOK_DOCS_LINK,
  NotificationChannel,
  NotificationWebhookChannel as WebhookTarget,
} from "@/interfaces/NotificationChannel";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";
import { useWebhookConfig } from "@/cloud/webhooks/useWebhookConfig";
import { WebhookGeneralTabContent } from "@/cloud/webhooks/WebhookGeneralTabContent";
import { WebhookHeadersTabContent } from "@/cloud/webhooks/WebhookHeadersTabContent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: NotificationChannel;
  onSave: (target: WebhookTarget) => void;
};

export default function NotificationWebhookModal({
  open,
  onOpenChange,
  channel,
  onSave,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      {open && (
        <NotificationWebhookModalContent
          channel={channel}
          onSave={(target) => {
            onSave(target);
            onOpenChange(false);
          }}
        />
      )}
    </Modal>
  );
}

type ModalContentProps = {
  channel: NotificationChannel;
  onSave: (target: WebhookTarget) => void;
};

function NotificationWebhookModalContent({
  channel,
  onSave,
}: Readonly<ModalContentProps>) {
  const t = useTranslations();
  const target = channel.target as WebhookTarget | undefined;

  const config = useWebhookConfig({
    initialUrl: target?.url,
    initialHeaders: target?.headers,
  });

  const [tab, setTab] = useState("general");
  const modalWidth = useMemo(
    () => (tab === "general" ? "max-w-xl" : "max-w-2xl"),
    [tab],
  );

  const handleSave = () => {
    onSave({
      url: config.url,
      headers: config.formatHeaders(),
    });
  };

  return (
    <ModalContent maxWidthClass={modalWidth}>
      <ModalHeader
        icon={<GlobeIcon size={16} />}
        title={
          config.isEditing
            ? t("notifications.webhookConfiguration")
            : t("notifications.connectWebhook")
        }
        description={
          config.isEditing
            ? t("notifications.webhookUpdateDescription")
            : t("notifications.webhookConnectDescription")
        }
      />

      <Tabs defaultValue={tab} value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={"general"} data-testid="webhook-tab-general">
            <TextIcon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("notifications.general")}
          </TabsTrigger>
          <TabsTrigger
            value={"headers"}
            disabled={!config.canContinueToHeaders}
            data-testid="webhook-tab-headers"
          >
            <FileCode2Icon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("notifications.headers")}
          </TabsTrigger>
        </TabsList>

        <WebhookGeneralTabContent
          value={config}
          urlHelpText={t(
            "notifications.fullHTTPSURLWhereNotificationEventsWillBeSent",
          )}
          mask={config.isEditing}
        />
        <WebhookHeadersTabContent value={config} />
      </Tabs>

      <div className={"h-6"}></div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("trafficEvents.learnMoreAbout")}
            <InlineLink
              href={NOTIFICATION_CHANNELS_WEBHOOK_DOCS_LINK}
              target={"_blank"}
            >
              {t("notifications.webhookNotifications")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {config.isEditing ? (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>{t("common.cancel")}</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={handleSave}
                disabled={!config.canSave}
                data-testid="webhook-save"
              >
                {t("common.saveChanges")}
              </Button>
            </>
          ) : (
            <>
              {tab === "general" && (
                <>
                  <ModalClose asChild={true}>
                    <Button variant={"secondary"}>{t("common.cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant={"primary"}
                    disabled={!config.canContinueToHeaders}
                    onClick={() => setTab("headers")}
                    data-testid="webhook-continue"
                  >
                    {t("common.continue")}
                  </Button>
                </>
              )}
              {tab === "headers" && (
                <>
                  <Button
                    variant={"secondary"}
                    onClick={() => setTab("general")}
                  >
                    {t("common.back")}
                  </Button>
                  <Button
                    variant={"primary"}
                    disabled={!config.canSave}
                    onClick={handleSave}
                    data-testid="webhook-save"
                  >
                    <Repeat size={16} />
                    {t("notifications.connect")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
