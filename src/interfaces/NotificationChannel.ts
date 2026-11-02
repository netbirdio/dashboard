export enum NotificationChannelType {
  Email = "email",
  Webhook = "webhook",
  Slack = "slack",
}

export interface NotificationChannel {
  id?: string;
  type?: NotificationChannelType;
  target?: NotificationEmailChannel | NotificationWebhookChannel;
  enabled: boolean;
  event_types: NotificationEventType[];
}

export interface NotificationEmailChannel {
  emails: string[];
}

export interface NotificationWebhookChannel {
  url: string;
  headers?: { [key: string]: string };
}

export interface NotificationEventTypeMap {
  [key: string]: string;
}

export enum NotificationEventType {
  PeerPendingApproval = "peer.pending.approval",
  PeerAdd = "peer.add",
  RoutingPeerDisconnect = "routing.peer.disconnect",
  RoutingPeerDelete = "routing.peer.delete",
  UserPendingApproval = "user.pending.approval",
  UserJoin = "user.join",
  ServiceUserCreate = "service.user.create",
  IdpSyncTokenExpire = "idp.sync.token.expire",
  EdrSyncTokenExpire = "edr.sync.token.expire",
}

export const ALL_NOTIFICATION_EVENT_TYPES = Object.values(
  NotificationEventType,
);

export const NOTIFICATION_CHANNELS_DOCS_LINK =
  "https://docs.netbird.io/manage/settings/notifications";

export const NOTIFICATION_CHANNELS_WEBHOOK_DOCS_LINK =
  "https://docs.netbird.io/manage/settings/notifications#webhook-notifications";
