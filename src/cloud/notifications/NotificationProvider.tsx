import React from "react";
import useFetchApi, { useApiCall } from "@utils/api";
import {
  ALL_NOTIFICATION_EVENT_TYPES,
  NotificationChannel,
  NotificationChannelType,
  NotificationEventType,
  NotificationEventTypeMap,
} from "@/interfaces/NotificationChannel";
import { useLoggedInUser } from "@/contexts/UsersProvider";

const DEFAULT_EMAIL_CHANNEL: Omit<NotificationChannel, "id"> = {
  type: NotificationChannelType.Email,
  enabled: false,
  event_types: [...ALL_NOTIFICATION_EVENT_TYPES],
};

const DEFAULT_WEBHOOK_CHANNEL: Omit<NotificationChannel, "id"> = {
  type: NotificationChannelType.Webhook,
  enabled: false,
  event_types: [...ALL_NOTIFICATION_EVENT_TYPES],
};

const DEFAULT_SLACK_CHANNEL: Omit<NotificationChannel, "id"> = {
  type: NotificationChannelType.Slack,
  enabled: false,
  event_types: [...ALL_NOTIFICATION_EVENT_TYPES],
};

type NotificationContextType = {
  types: NotificationEventTypeMap | undefined;
  isTypesLoading: boolean;
  channels: NotificationChannel[] | undefined;
  isChannelsLoading: boolean;
  isLoading: boolean;
  getFirstChannelByType: (
    type: NotificationChannelType,
  ) => NotificationChannel | undefined;
  createChannel: (channel: NotificationChannel) => Promise<NotificationChannel>;
  createDefaultChannel: (type: NotificationChannelType) => Promise<NotificationChannel>;
  updateChannel: (channel: NotificationChannel) => Promise<NotificationChannel>;
  toggleType: (channel: NotificationChannel, eventType: NotificationEventType) => Promise<void>;
};

const NotificationContext = React.createContext<NotificationContextType>(
  {} as NotificationContextType,
);

type Props = {
  children: React.ReactNode;
};

export default function NotificationProvider({ children }: Props) {
  const { loggedInUser } = useLoggedInUser();

  const { data: types, isLoading: isTypesLoading } =
    useFetchApi<NotificationEventTypeMap>("/integrations/notifications/types");

  const {
    data: channels,
    isLoading: isChannelsLoading,
    mutate,
  } = useFetchApi<NotificationChannel[]>(
    "/integrations/notifications/channels",
  );

  const channelRequest = useApiCall<NotificationChannel>(
    "/integrations/notifications/channels",
  );

  const isLoading = isTypesLoading || isChannelsLoading;

  const getFirstChannelByType = (type: NotificationChannelType) => {
    return channels?.find((c) => c.type === type);
  };

  const createChannel = async (channel: NotificationChannel) => {
    const result = await channelRequest.post(channel);
    await mutate();
    return result;
  };

  const createDefaultChannel = async (type: NotificationChannelType) => {
    let channel: NotificationChannel;
    switch (type) {
      case NotificationChannelType.Email:
        channel = { ...DEFAULT_EMAIL_CHANNEL };
        if (loggedInUser?.email) {
          channel.target = { emails: [loggedInUser.email] };
        }
        break;
      case NotificationChannelType.Slack:
        channel = { ...DEFAULT_SLACK_CHANNEL };
        break;
      case NotificationChannelType.Webhook:
        channel = { ...DEFAULT_WEBHOOK_CHANNEL };
        break;
    }
    return createChannel(channel);
  };

  const updateChannel = async (channel: NotificationChannel) => {
    const { id, ...payload } = channel;
    const result = await channelRequest.put(payload, `/${id}`);
    await mutate();
    return result;
  };

  const toggleType = async (
    channel: NotificationChannel,
    eventType: NotificationEventType,
  ) => {
    const hasType = channel.event_types.includes(eventType);
    const updatedChannel = {
      ...channel,
      event_types: hasType
        ? channel.event_types.filter((t) => t !== eventType)
        : [...channel.event_types, eventType],
    };
    await updateChannel(updatedChannel);
  };

  return (
    <NotificationContext.Provider
      value={{
        types,
        isTypesLoading,
        channels,
        isChannelsLoading,
        isLoading,
        getFirstChannelByType,
        createChannel,
        createDefaultChannel,
        updateChannel,
        toggleType,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  return React.useContext(NotificationContext);
};

