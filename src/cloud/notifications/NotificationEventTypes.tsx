import { useTranslations } from "next-intl";
import * as React from "react";
import { Label } from "@components/Label";
import PeerIcon from "@/assets/icons/PeerIcon";
import Card from "@components/Card";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import TeamIcon from "@/assets/icons/TeamIcon";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import { NotificationEventType } from "@/interfaces/NotificationChannel";

type EventTypeMeta = {
  key: NotificationEventType;
  label: string;
  helpText: string;
  group: "peer" | "user" | "integration";
};

const getEventTypeMetadata = (
  t: ReturnType<typeof useTranslations>,
): EventTypeMeta[] => [
  {
    key: NotificationEventType.PeerPendingApproval,
    label: t("pendingApproval"),
    helpText: t("peerPendingApprovalHelp"),
    group: "peer",
  },
  {
    key: NotificationEventType.PeerAdd,
    label: t("peerAdded"),
    helpText: t("peerAddedHelp"),
    group: "peer",
  },
  {
    key: NotificationEventType.RoutingPeerDisconnect,
    label: t("routingPeerDisconnected"),
    helpText: t("routingPeerDisconnectedHelp"),
    group: "peer",
  },
  {
    key: NotificationEventType.RoutingPeerDelete,
    label: t("routingPeerDeleted"),
    helpText: t("routingPeerDeletedHelp"),
    group: "peer",
  },
  {
    key: NotificationEventType.UserPendingApproval,
    label: t("userPendingApproval"),
    helpText: t("userPendingApprovalHelp"),
    group: "user",
  },
  {
    key: NotificationEventType.UserJoin,
    label: t("userJoined"),
    helpText: t("userJoinedHelp"),
    group: "user",
  },
  {
    key: NotificationEventType.ServiceUserCreate,
    label: t("serviceUserCreated"),
    helpText: t("serviceUserCreatedHelp"),
    group: "user",
  },
  {
    key: NotificationEventType.IdpSyncTokenExpire,
    label: t("idpSyncTokenExpired"),
    helpText: t("idpSyncTokenExpiredHelp"),
    group: "integration",
  },
  {
    key: NotificationEventType.EdrSyncTokenExpire,
    label: t("edrSyncTokenExpired"),
    helpText: t("edrSyncTokenExpiredHelp"),
    group: "integration",
  },
];

const getGroupConfig = (t: ReturnType<typeof useTranslations>) => ({
  peer: {
    label: t("peerNotifications"),
    icon: <PeerIcon size={12} />,
  },
  user: {
    label: t("userNotifications"),
    icon: <TeamIcon size={12} />,
  },
  integration: {
    label: t("integrationNotifications"),
    icon: <IntegrationIcon size={12} />,
  },
} as const);

const GROUPS: Array<"peer" | "user" | "integration"> = [
  "peer",
  "user",
  "integration",
];

type Props = {
  event_types: NotificationEventType[];
  onToggle: (type: NotificationEventType) => void;
  disabled?: boolean;
};

export const NotificationEventTypes = ({ event_types, onToggle, disabled }: Props) => {
  const t = useTranslations("notifications");
  const EVENT_TYPE_METADATA = getEventTypeMetadata(t);
  const GROUP_CONFIG = getGroupConfig(t);

  return (
    <>
      {GROUPS.map((group) => {
        const config = GROUP_CONFIG[group];
        const types = EVENT_TYPE_METADATA.filter((type) => type.group === group);
        return (
          <div key={group} className={"flex flex-col gap-2 relative w-full"}>
            <Label>
              {config.icon}
              {config.label}
            </Label>
            <Card
              className={
                "w-full flex flex-col border-nb-gray-910 bg-nb-gray-935"
              }
            >
              {types.map((type, index) => (
                <React.Fragment key={type.key}>
                  {index > 0 && <Separator />}
                  <FancyToggleSwitch
                    value={event_types.includes(type.key)}
                    onChange={() => onToggle(type.key)}
                    disabled={disabled}
                    data-testid={`notification-event-${type.key}`}
                    label={type.label}
                    helpText={type.helpText}
                    variant={"blank"}
                    className={
                      "px-5 py-4 hover:bg-nb-gray-930 transition-colors duration-150"
                    }
                    textWrapperClassName={""}
                  />
                </React.Fragment>
              ))}
            </Card>
          </div>
        );
      })}
    </>
  );
};

const Separator = () => (
  <span className={"h-px w-full block bg-nb-gray-920"}></span>
);
