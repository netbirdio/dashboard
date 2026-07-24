import { useTranslations } from "next-intl";
import Breadcrumbs from "@components/Breadcrumbs";
import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLinkIcon, MessageSquareDot } from "lucide-react";
import React from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useIsLicensed } from "@/hooks/useIsLicensed";
import { VerticalTabs } from "@components/VerticalTabs";
import InlineLink from "@components/InlineLink";
import Card from "@components/Card";
import { NotificationEmailChannel } from "@/cloud/notifications/channels/NotificationEmailChannel";
import { NotificationWebhookChannel } from "@/cloud/notifications/channels/NotificationWebhookChannel";
import useUrlTab from "@/hooks/useUrlTab";
import Paragraph from "@components/Paragraph";
import NotificationProvider, {
  useNotifications,
} from "@/cloud/notifications/NotificationProvider";
import { NotificationChannelListItem } from "@/cloud/notifications/NotificationChannelListItem";
import {
  NOTIFICATION_CHANNELS_DOCS_LINK,
  NotificationChannelType,
} from "@/interfaces/NotificationChannel";
import { SkeletonNotificationSettings } from "@components/skeletons/SkeletonNotificationSettings";
import { NotificationSlackChannel } from "@/cloud/notifications/channels/NotificationSlackChannel";
import { SmallBadge } from "@components/ui/SmallBadge";

const NotificationsOverview = ({
  onSelectChannel,
}: {
  onSelectChannel: (value: string) => void;
}) => {
  const { getFirstChannelByType } = useNotifications();
  const { permission } = usePermissions();
  const canUpdate = permission?.settings?.update ?? false;
  const t = useTranslations("notifications");
  const tc = useTranslations("common");

  const emailChannel = getFirstChannelByType(NotificationChannelType.Email);
  const webhookChannel = getFirstChannelByType(NotificationChannelType.Webhook);
  const slackChannel = getFirstChannelByType(NotificationChannelType.Slack);

  return (
    <div className={"p-default py-6 max-w-2xl"}>
      <Breadcrumbs>
        <Breadcrumbs.Item
          href={"/settings"}
          label={tc("settings")}
          icon={<SettingsIcon size={13} />}
        />
        <Breadcrumbs.Item
          href={"/settings?tab=notifications"}
          label={t("title")}
          icon={<MessageSquareDot size={14} />}
          active
        />
      </Breadcrumbs>
      <div className={"flex items-start justify-between"}>
        <div>
          <h1>{t("title")}</h1>
          <Paragraph>
            {t("description")}
          </Paragraph>
          <Paragraph>
            {t("learnMore")}{" "}
            <InlineLink
              href={NOTIFICATION_CHANNELS_DOCS_LINK}
              target={"_blank"}
            >
              {t("notificationChannels")}
              <ExternalLinkIcon size={12} />
            </InlineLink>{" "}
            {t("inOurDocumentation")}
          </Paragraph>
        </div>
      </div>
      <Card
        className={
          "w-full flex flex-col mt-6 border-nb-gray-920 bg-nb-gray-940 p-1.5"
        }
      >
        <NotificationChannelListItem
          type={NotificationChannelType.Email}
          channel={emailChannel}
          onClick={() => onSelectChannel(NotificationChannelType.Email)}
          disabled={!canUpdate && !emailChannel}
        />
        <NotificationChannelListItem
          type={NotificationChannelType.Webhook}
          channel={webhookChannel}
          onClick={() => onSelectChannel(NotificationChannelType.Webhook)}
          disabled={!canUpdate && !webhookChannel}
        />
        <NotificationChannelListItem
          type={NotificationChannelType.Slack}
          channel={slackChannel}
          onClick={() => onSelectChannel(NotificationChannelType.Slack)}
          disabled={!canUpdate && !slackChannel}
        />
      </Card>
    </div>
  );
};

export const NotificationTab = () => {
  const { permission } = usePermissions();
  const { isLicensed } = useIsLicensed();
  const [channel, setChannel] = useUrlTab(
    [
      NotificationChannelType.Email,
      NotificationChannelType.Webhook,
      NotificationChannelType.Slack,
    ],
    "",
    "channel",
  );

  const canView = permission?.settings?.read && isLicensed;
  if (!canView) return;

  return (
    <NotificationProvider>
      <Tabs.Content value={"notifications"} className={"w-full"}>
        <NotificationTabContent
          channel={channel}
          onSelectChannel={setChannel}
        />
      </Tabs.Content>
    </NotificationProvider>
  );
};

const NotificationTabContent = ({
  channel,
  onSelectChannel,
}: {
  channel: string;
  onSelectChannel: (value: string) => void;
}) => {
  const { isLoading } = useNotifications();

  if (isLoading) return <SkeletonNotificationSettings />;

  if (channel === NotificationChannelType.Email)
    return <NotificationEmailChannelPage />;
  if (channel === NotificationChannelType.Webhook)
    return <NotificationWebhookChannelPage />;
  if (channel === NotificationChannelType.Slack)
    return <NotificationSlackChannelPage />;
  return <NotificationsOverview onSelectChannel={onSelectChannel} />;
};

const NotificationEmailChannelPage = () => {
  const { getFirstChannelByType } = useNotifications();
  const channel = getFirstChannelByType(NotificationChannelType.Email);
  if (!channel) return null;
  return <NotificationEmailChannel channel={channel} />;
};

const NotificationWebhookChannelPage = () => {
  const { getFirstChannelByType } = useNotifications();
  const channel = getFirstChannelByType(NotificationChannelType.Webhook);
  if (!channel) return null;
  return <NotificationWebhookChannel channel={channel} />;
};

const NotificationSlackChannelPage = () => {
  const { getFirstChannelByType } = useNotifications();
  const channel = getFirstChannelByType(NotificationChannelType.Slack);
  if (!channel) return null;
  return <NotificationSlackChannel channel={channel} />;
};

export const NotificationsTabTrigger = () => {
  const { permission } = usePermissions();
  const { isLicensed } = useIsLicensed();
  const t = useTranslations("notifications");

  const canView = permission?.settings?.read && isLicensed;
  if (!canView) return;

  return (
    <VerticalTabs.Trigger value="notifications">
      <MessageSquareDot size={14} />
      {t("title")}
      <SmallBadge
        text={t("beta")}
        variant={"sky"}
        className={"text-[8px] leading-none py-[3px] px-[5px]"}
        textClassName={"top-0"}
      />
    </VerticalTabs.Trigger>
  );
};
