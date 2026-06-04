import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/HoverCard";
import { ListItem } from "@components/ListItem";
import GroupBadge from "@components/ui/GroupBadge";
import { UserCountStack } from "@components/ui/MultipleGroups";
import {
  ArrowRightIcon,
  Binary,
  CircleUser,
  FileCode2Icon,
  HelpCircle,
  LockKeyhole,
  LockOpenIcon,
  LucideIcon,
  RectangleEllipsis,
  Settings,
  Users,
} from "lucide-react";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { Group } from "@/interfaces/Group";
import { isL4Mode, ReverseProxy } from "@/interfaces/ReverseProxy";
import FullTooltip from "@components/FullTooltip";

const AUTH_METHODS: {
  key: "password_auth" | "pin_auth" | "bearer_auth";
  label: string;
  hoverLabel: string;
  Icon: LucideIcon;
}[] = [
  {
    key: "password_auth",
    label: "Password",
    hoverLabel: "Password",
    Icon: RectangleEllipsis,
  },
  { key: "pin_auth", label: "PIN Code", hoverLabel: "PIN Code", Icon: Binary },
  {
    key: "bearer_auth",
    label: "SSO",
    hoverLabel: "SSO (Single Sign On)",
    Icon: Users,
  },
];

const HEADER_AUTH_METHOD = {
  label: "HTTP Headers",
  hoverLabel: "HTTP Headers",
  Icon: FileCode2Icon,
};

const NETBIRD_ONLY_METHOD = {
  label: "NetBird Only",
  hoverLabel: "NetBird-Only Access",
  Icon: CircleUser,
};

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyAuthCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const { groups } = useGroups();

  if (isL4Mode(reverseProxy.mode)) {
    return (
      <div className={"flex"}>
        <FullTooltip
          content={
            <div className={"flex text-xs max-w-[340px]"}>
              Auth methods are not supported for TCP/UDP and TLS passthrough
              services as they operate at the network layer.
            </div>
          }
        >
          <Badge variant={"gray"}>
            N/A
            <HelpCircle size={12} />
          </Badge>
        </FullTooltip>
      </div>
    );
  }

  const auth = reverseProxy.auth;
  const isPrivate = !!reverseProxy.private;

  const enabled = AUTH_METHODS.filter((m) => auth?.[m.key]?.enabled);
  const hasHeaderAuths = (auth?.header_auths ?? []).some((h) => h.enabled);
  const authCount =
    enabled.length + (hasHeaderAuths ? 1 : 0) + (isPrivate ? 1 : 0);

  const ssoGroups = auth?.bearer_auth?.enabled
    ? (auth.bearer_auth.distribution_groups ?? [])
        .map((groupId) => groups?.find((g) => g.id === groupId))
        .filter((g): g is Group => g != undefined)
    : [];

  const accessGroups = isPrivate
    ? (reverseProxy.access_groups ?? [])
        .map((groupId) => groups?.find((g) => g.id === groupId))
        .filter((g): g is Group => g != undefined)
    : [];

  const canConfigure = !!permission?.services?.update;

  const authBadge = (
    <Badge
      variant={"gray"}
      useHover={false}
      disabled={!canConfigure}
      className={
        "cursor-pointer !rounded-r-none !border-r-0 !h-[34px] !px-2 min-w-[50px] hover:bg-nb-gray-930 transition-all"
      }
    >
      {authCount > 0 ? (
        <LockKeyhole size={12} className="text-green-500" />
      ) : (
        <LockOpenIcon size={12} className="text-red-500" />
      )}
      <span className={"font-medium text-xs"}>{authCount}</span>
    </Badge>
  );

  const showAuthHover = authCount > 0;

  return (
    <div
      className={"flex"}
      data-auth-cell
      onClick={(e) => {
        e.stopPropagation();
        if (permission?.services?.update) {
          openModal({ proxy: reverseProxy, initialTab: "auth" });
        }
      }}
    >
      <div className={"flex items-center"}>
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild={true}>{authBadge}</HoverCardTrigger>
          {showAuthHover && (
            <HoverCardContent
              className={"p-0"}
              sideOffset={14}
              onClick={(e) => e.stopPropagation()}
            >
                <div className={"text-xs"}>
                  {enabled.map(({ key, hoverLabel, Icon }) => (
                    <ListItem
                      key={key}
                      className={"py-0.5"}
                      icon={<Icon size={14} />}
                      label={hoverLabel}
                      value={
                        <div className={"text-green-500"}>
                          {key === "bearer_auth" && ssoGroups.length === 0
                            ? "All Users"
                            : "Enabled"}
                        </div>
                      }
                    >
                      {key === "bearer_auth" && ssoGroups.length > 0 && (
                        <div className={"flex flex-col gap-2 px-4 pt-2 pb-3"}>
                          {ssoGroups.map((group) => (
                            <div
                              key={group.id}
                              className={
                                "flex gap-2 items-center justify-between"
                              }
                            >
                              <GroupBadge group={group} />
                              <ArrowRightIcon size={14} />
                              <UserCountStack group={group} />
                            </div>
                          ))}
                        </div>
                      )}
                    </ListItem>
                  ))}
                  {hasHeaderAuths && (
                    <ListItem
                      className={"py-0.5"}
                      icon={<FileCode2Icon size={14} />}
                      label={HEADER_AUTH_METHOD.hoverLabel}
                      value={
                        <div className={"text-green-500"}>
                          {
                            (auth?.header_auths ?? []).filter((h) => h.enabled)
                              .length
                          }{" "}
                          Header
                          {(auth?.header_auths ?? []).filter((h) => h.enabled)
                            .length !== 1
                            ? "s"
                            : ""}
                        </div>
                      }
                    />
                  )}
                  {isPrivate && (
                    <ListItem
                      className={"py-0.5"}
                      icon={<CircleUser size={14} />}
                      label={NETBIRD_ONLY_METHOD.hoverLabel}
                      value={
                        <div className={"text-green-500"}>
                          {accessGroups.length === 0
                            ? "No groups"
                            : accessGroups.length === 1
                              ? "1 Group"
                              : `${accessGroups.length} Groups`}
                        </div>
                      }
                    >
                      {accessGroups.length > 0 && (
                        <div className={"flex flex-col gap-2 px-4 pt-2 pb-3"}>
                          {accessGroups.map((group) => (
                            <div
                              key={group.id}
                              className={
                                "flex gap-2 items-center justify-between"
                              }
                            >
                              <GroupBadge group={group} />
                              <ArrowRightIcon size={14} />
                              <UserCountStack group={group} />
                            </div>
                          ))}
                        </div>
                      )}
                    </ListItem>
                  )}
                </div>
            </HoverCardContent>
          )}
        </HoverCard>
        <Button
          size={"xs"}
          variant={"secondary"}
          className={"!rounded-l-none !px-2 !h-[34px]"}
          onClick={(e) => {
            e.stopPropagation();
            openModal({ proxy: reverseProxy, initialTab: "auth" });
          }}
          disabled={!permission?.services?.update}
          aria-label="Configure authentication"
        >
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
}
