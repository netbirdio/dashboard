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

const EVENT_TYPE_METADATA: EventTypeMeta[] = [
  {
    key: NotificationEventType.PeerPendingApproval,
    label: "Pending Approval",
    helpText: "Notify when a peer is waiting for approval to join the network",
    group: "peer",
  },
  {
    key: NotificationEventType.PeerAdd,
    label: "Peer Added",
    helpText: "Notify when a new peer is added to the network",
    group: "peer",
  },
  {
    key: NotificationEventType.RoutingPeerDisconnect,
    label: "Routing Peer Disconnected",
    helpText: "Notify when a routing peer loses its connection",
    group: "peer",
  },
  {
    key: NotificationEventType.RoutingPeerDelete,
    label: "Routing Peer Deleted",
    helpText: "Notify when a routing peer is deleted from the network",
    group: "peer",
  },
  {
    key: NotificationEventType.UserPendingApproval,
    label: "User Pending Approval",
    helpText: "Notify when a user is waiting for approval to join the network",
    group: "user",
  },
  {
    key: NotificationEventType.UserJoin,
    label: "User Joined",
    helpText: "Notify when a new user joins the account",
    group: "user",
  },
  {
    key: NotificationEventType.ServiceUserCreate,
    label: "Service User Created",
    helpText: "Notify when a new service user is created",
    group: "user",
  },
  {
    key: NotificationEventType.IdpSyncTokenExpire,
    label: "IdP Sync Token Expired",
    helpText: "Notify when the IdP sync token has expired and needs renewal",
    group: "integration",
  },
  {
    key: NotificationEventType.EdrSyncTokenExpire,
    label: "EDR Sync Token Expired",
    helpText: "Notify when the EDR sync token has expired and needs renewal",
    group: "integration",
  },
];

const GROUP_CONFIG = {
  peer: {
    label: "Peer Notifications",
    icon: <PeerIcon size={12} />,
  },
  user: {
    label: "User Notifications",
    icon: <TeamIcon size={12} />,
  },
  integration: {
    label: "Integration Notifications",
    icon: <IntegrationIcon size={12} />,
  },
} as const;

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
  return (
    <>
      {GROUPS.map((group) => {
        const config = GROUP_CONFIG[group];
        const types = EVENT_TYPE_METADATA.filter((t) => t.group === group);
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
