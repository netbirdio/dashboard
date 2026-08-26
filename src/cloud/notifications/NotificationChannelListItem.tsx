import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, GlobeIcon, Loader2, MailIcon } from "lucide-react";
import { cn } from "@utils/helpers";
import {
  ALL_NOTIFICATION_EVENT_TYPES,
  NotificationChannel,
  NotificationChannelType,
  NotificationEmailChannel,
} from "@/interfaces/NotificationChannel";
import { useNotifications } from "@/cloud/notifications/NotificationProvider";
import SlackIcon from "@/assets/icons/SlackIcon";

type NotificationChannelListItemProps = {
  type: NotificationChannelType;
  channel?: NotificationChannel;
  onClick?: () => void;
  disabled?: boolean;
};

const channelMeta: Record<
  NotificationChannelType,
  { name: string; icon: React.ReactNode }
> = {
  [NotificationChannelType.Email]: { name: "Email", icon: <MailIcon size={16} /> },
  [NotificationChannelType.Webhook]: { name: "Webhook", icon: <GlobeIcon size={16} /> },
  [NotificationChannelType.Slack]: { name: "Slack", icon: <SlackIcon size={16} /> },
};

const getChannelDescription = (
  type: NotificationChannelType,
  channel?: NotificationChannel,
) => {
  if (!channel) return "Disabled";
  if (!channel.enabled) return "Disabled";

  const totalTypes = ALL_NOTIFICATION_EVENT_TYPES.length;
  const activeTypes = channel.event_types.length;
  const notificationLabel =
    activeTypes === totalTypes
      ? "All Notifications"
      : `${activeTypes} of ${totalTypes} Notifications`;

  if (type === NotificationChannelType.Email) {
    const emails = (channel.target as NotificationEmailChannel)?.emails ?? [];
    return `Enabled · ${notificationLabel} · ${emails.length} Recipient${
      emails.length !== 1 ? "s" : ""
    }`;
  }
  return `Enabled · ${notificationLabel}`;
};

export const NotificationChannelListItem = ({
  type,
  channel,
  onClick,
  disabled,
}: NotificationChannelListItemProps) => {
  const { createDefaultChannel } = useNotifications();
  const [isCreating, setIsCreating] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const meta = channelMeta[type];
  const active = channel?.enabled ?? false;
  const description = getChannelDescription(type, channel);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleClick = async () => {
    if (!channel) {
      setIsCreating(true);
      timerRef.current = setTimeout(() => setShowLoading(true), 200);
      try {
        await createDefaultChannel(type);
      } finally {
        clearTimeout(timerRef.current);
        setIsCreating(false);
        setShowLoading(false);
      }
    }
    onClick?.();
  };

  return (
    <button
      data-testid={`notification-channel-${type}`}
      className={cn(
        "flex items-center w-full gap-4 dark:text-neutral-300 text-neutral-500 transition-all group/channel rounded-md px-3 py-2.5",
        onClick && !disabled
          ? "hover:text-neutral-100 hover:bg-nb-gray-930 cursor-pointer relative"
          : "cursor-default",
      )}
      onClick={handleClick}
      disabled={isCreating || disabled}
    >
      <div
        className={cn(
          "bg-nb-gray-910 text-nb-gray-100 group-hover/channel:bg-nb-gray-900 rounded-md flex items-center justify-center font-medium relative",
          "h-10 w-10 shrink-0 transition-all",
        )}
      >
        {meta.icon}
        <div
          className={cn(
            "h-2 w-2 rounded-full absolute bottom-0 right-0 z-10",
            active ? "bg-green-500" : "bg-nb-gray-700",
          )}
        ></div>
        <div
          className={cn(
            "h-3 w-3 bg-nb-gray-935 rounded-tl-[8px] rounded-br absolute bottom-0 right-0 transition-all",
            onClick && !disabled && "group-hover/channel:!bg-nb-gray-930",
          )}
        ></div>
      </div>
      <div className={"flex items-start flex-col"}>
        <p className={"font-medium text-left whitespace-nowrap text-sm"}>
          {meta.name}
        </p>
        {description && (
          <span className={"text-xs text-nb-gray-300 text-left mt-0.5"}>
            {description}
          </span>
        )}
      </div>
      {onClick && !disabled && (
        <div
          className={
            "absolute right-0 top-0 h-full flex items-center pr-4 text-nb-gray-400 group-hover/channel:text-nb-gray-100 transition-all"
          }
        >
          {showLoading ? (
            <Loader2 size={18} className={"animate-spin"} />
          ) : (
            <ChevronRight size={18} />
          )}
        </div>
      )}
    </button>
  );
};
