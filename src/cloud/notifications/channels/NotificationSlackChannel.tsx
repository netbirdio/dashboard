import { useTranslations } from "next-intl";
import * as React from "react";
import { useState } from "react";
import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import TruncatedText from "@components/ui/TruncatedText";
import { cn } from "@utils/helpers";
import {
  MessageSquareDot,
  Link2Off,
  MoreVertical,
  Repeat,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import SlackIcon from "@/assets/icons/SlackIcon";
import { NotificationEventTypes } from "@/cloud/notifications/NotificationEventTypes";
import {
  NotificationChannel,
  NotificationEventType,
  NotificationWebhookChannel as SlackTarget,
} from "@/interfaces/NotificationChannel";
import { useNotifications } from "@/cloud/notifications/NotificationProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import NotificationSlackModal from "@/cloud/notifications/channels/NotificationSlackModal";

type Props = {
  channel: NotificationChannel;
};

export const NotificationSlackChannel = ({ channel }: Props) => {
  const { updateChannel, toggleType } = useNotifications();
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const canUpdate = permission?.settings?.update ?? false;
  const [modalOpen, setModalOpen] = useState(false);
  const t = useTranslations("notifications");
  const tc = useTranslations("common");

  const target = channel.target as SlackTarget | undefined;
  const isConnected = !!target?.url;

  const handleSave = (newTarget: SlackTarget) => {
    const isNew = !isConnected;
    notify({
      title: t("slackNotifications"),
      description: isNew
        ? `Slack ${t("connected")}.`
        : `Slack ${t("updated")}.`,
      promise: updateChannel({ ...channel, enabled: true, target: newTarget }),
      loadingMessage: isNew ? `${t("connecting")} Slack...` : `${t("updating")} Slack...`,
    });
  };

  const handleDisconnect = async () => {
    const choice = await confirm({
      title: t("disconnectSlack"),
      description: t("disconnectSlackConfirm"),
      confirmText: tc("delete"),
      cancelText: tc("cancel"),
      type: "danger",
    });
    if (!choice) return;
    notify({
      title: t("slackNotifications"),
      description: `Slack ${t("disconnected")}.`,
      promise: updateChannel({
        ...channel,
        enabled: false,
        target: undefined,
      }),
      loadingMessage: `${t("disconnecting")} Slack...`,
    });
  };

  const handleToggleType = (eventType: NotificationEventType) => {
    toggleType(channel, eventType);
  };

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
        />
        <Breadcrumbs.Item
          href={"/settings?tab=notifications&channel=slack"}
          label={t("slack")}
          icon={<SlackIcon size={14} />}
          active
        />
      </Breadcrumbs>
      <div className={"flex items-start justify-between"}>
        <div className={"flex gap-3 items-center"}>
          <h1>{t("slack")}</h1>
        </div>
      </div>
      <div className={"flex flex-col gap-8 mt-4"}>
        <Card
          className={
            "w-full flex items-center gap-4 border-nb-gray-910 bg-nb-gray-935 px-5 py-4"
          }
        >
          <div
            className={cn(
              "bg-nb-gray-910 rounded-md flex items-center justify-center relative",
              "h-10 w-10 shrink-0",
            )}
          >
            <SlackIcon size={16} />
            <div
              className={cn(
                "h-2 w-2 rounded-full absolute bottom-0 right-0 z-10",
                isConnected ? "bg-green-500" : "bg-nb-gray-700",
              )}
            ></div>
            <div
              className={
                "h-3 w-3 bg-nb-gray-935 rounded-tl-[8px] rounded-br absolute bottom-0 right-0"
              }
            ></div>
          </div>
          <div className={"flex items-start flex-col flex-1 min-w-0 pr-10"}>
            <p className={"font-medium text-sm"}>Slack</p>
            {isConnected ? (
              <TruncatedText
                text={target?.url}
                maxWidth={"100%"}
                className={"text-xs text-nb-gray-300 mt-0.5"}
              />
            ) : (
              <span className={"text-xs text-nb-gray-300 mt-0.5"}>
                {t("notConnected")}
              </span>
            )}
          </div>
          {isConnected ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild={true}>
                <Button
                  variant={"secondary"}
                  size={"xs"}
                  className={"!px-2"}
                  data-testid="slack-actions"
                >
                  <MoreVertical size={14} className={"shrink-0"} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className={"w-auto min-w-[140px]"}
                align="end"
              >
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  variant={"danger"}
                  disabled={!canUpdate}
                  data-testid="slack-disconnect"
                >
                  <div className={"flex gap-3 items-center"}>
                    <Link2Off size={14} className={"shrink-0"} />
                    {tc("delete")}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant={"primary"}
              size={"xs"}
              className={"!px-3"}
              onClick={() => setModalOpen(true)}
              disabled={!canUpdate}
              data-testid="slack-channel-connect"
            >
              <Repeat size={13} />
              {t("connect")}
            </Button>
          )}
        </Card>

        <NotificationEventTypes
          event_types={channel.event_types}
          onToggle={handleToggleType}
          disabled={!canUpdate}
        />
      </div>

      <NotificationSlackModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
      />
    </div>
  );
};
