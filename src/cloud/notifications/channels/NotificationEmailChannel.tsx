import { useTranslations } from "next-intl";
import * as React from "react";
import { useRef, useState } from "react";
import Breadcrumbs from "@components/Breadcrumbs";
import { cn } from "@utils/helpers";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import {
  MailIcon,
  MessageSquareDot,
  PlusCircle,
  Power,
  XIcon,
} from "lucide-react";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { Input } from "@components/Input";
import Button from "@components/Button";
import Badge from "@components/Badge";
import { notify } from "@components/Notification";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { SmallUserAvatar } from "@/modules/users/SmallUserAvatar";
import { NotificationEventTypes } from "@/cloud/notifications/NotificationEventTypes";
import {
  NotificationChannel,
  NotificationEmailChannel as EmailTarget,
  NotificationEventType,
} from "@/interfaces/NotificationChannel";
import { useNotifications } from "@/cloud/notifications/NotificationProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";

type Props = {
  channel: NotificationChannel;
};

export const NotificationEmailChannel = ({ channel }: Props) => {
  const { updateChannel, toggleType } = useNotifications();
  const { users } = useUsers();
  const { permission } = usePermissions();
  const canUpdate = permission?.settings?.update ?? false;
  const [emailInput, setEmailInput] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("notifications");
  const tc = useTranslations("common");

  const target = channel.target as EmailTarget | undefined;
  const emails = target?.emails ?? [];

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());

  const handleToggleEnabled = (enabled: boolean) => {
    updateChannel({ ...channel, enabled });
  };

  const handleAddEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed || emails.includes(trimmed)) return;
    notify({
      title: t("emailNotifications"),
      description: `${trimmed} ${t("addedSuccessfully")}`,
      promise: updateChannel({
        ...channel,
        target: { emails: [...emails, trimmed] },
      }),
      loadingTitle: t("emailNotifications"),
      loadingMessage: `${t("adding")} ${trimmed}...`,
    });
    setEmailInput("");
  };

  const handleRemoveEmail = (email: string) => {
    const remaining = emails.filter((e) => e !== email);
    notify({
      title: t("emailNotifications"),
      description: `${email} ${t("removedSuccessfully")}`,
      promise: updateChannel({
        ...channel,
        target: remaining.length > 0 ? { emails: remaining } : undefined,
      }),
      loadingTitle: t("emailNotifications"),
      loadingMessage: `${t("removing")} ${email}...`,
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
          href={"/settings?tab=notifications&channel=email"}
          label={t("email")}
          icon={<MailIcon size={14} />}
          active
        />
      </Breadcrumbs>
      <div className={"flex items-start justify-between"}>
        <div className={"flex gap-3 items-center"}>
          <h1>{t("email")}</h1>
        </div>
      </div>
      <div className={"flex flex-col gap-8 mt-4"}>
        <FancyToggleSwitch
          value={channel.enabled}
          onChange={handleToggleEnabled}
          disabled={!canUpdate}
          data-testid="notification-email-enabled"
          label={
            <>
              <Power size={15} />
              {t("enableEmailChannel")}
            </>
          }
          helpText={t("enableEmailChannelHelp")}
        />
        <div className={"flex flex-col relative w-full"}>
          <Label>
            <MailIcon size={14} />
            {t("emailAddresses")}
          </Label>
          <HelpText>
            {t("emailAddressesHelp")}
          </HelpText>
          <div className={"flex gap-3"}>
            <Input
              ref={emailInputRef}
              placeholder={t("emailPlaceholder")}
              maxWidthClass={"w-full"}
              disabled={!canUpdate}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              data-testid="notification-email-input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidEmail) {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
            />
            <Button
              variant={"primary"}
              onClick={handleAddEmail}
              disabled={!isValidEmail || !canUpdate}
              data-testid="notification-email-add"
            >
              <PlusCircle size={14} />
              {t("add")}
            </Button>
          </div>

          {emails.length > 0 && (
            <div className={"mt-3 flex gap-2 flex-wrap"}>
              {emails.map((email) => (
                <Badge
                  key={email}
                  variant={"lightGray"}
                  className={cn("group py-1.5 pl-2", canUpdate ? "cursor-pointer" : "cursor-default")}
                  useHover={canUpdate}
                  onClick={canUpdate ? () => handleRemoveEmail(email) : undefined}
                  data-testid="notification-email-recipient"
                >
                  <SmallUserAvatar
                    email={email}
                    name={users?.find((u) => u.email === email)?.name || email}
                    size={"sm"}
                  />
                  {email}
                  {canUpdate && (
                    <XIcon
                      size={12}
                      className={
                        "cursor-pointer group-hover:text-nb-gray-100 transition-all shrink-0"
                      }
                    />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <NotificationEventTypes
          event_types={channel.event_types}
          onToggle={handleToggleType}
          disabled={!canUpdate}
        />
      </div>
    </div>
  );
};
