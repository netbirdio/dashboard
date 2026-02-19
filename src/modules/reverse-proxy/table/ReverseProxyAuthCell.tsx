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
  LucideIcon,
  RectangleEllipsis,
  Settings,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { Group } from "@/interfaces/Group";
import { ReverseProxy } from "@/interfaces/ReverseProxy";

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

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyAuthCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const { groups } = useGroups();
  const auth = reverseProxy.auth;

  const enabled = AUTH_METHODS.filter((m) => auth?.[m.key]?.enabled);

  const ssoGroups = auth?.bearer_auth?.enabled
    ? (auth.bearer_auth.distribution_groups ?? [])
        .map((groupId) => groups?.find((g) => g.id === groupId))
        .filter((g): g is Group => g != undefined)
    : [];

  const showHoverContent =
    enabled.length > 1 || (enabled.length === 1 && auth?.bearer_auth?.enabled);

  const SingleIcon = enabled.length === 1 ? enabled[0].Icon : null;

  const badgeContent =
    SingleIcon ? (
      <>
        <SingleIcon size={12} className="text-green-500" />
        <span className={"font-medium text-xs"}>{enabled[0].label}</span>
      </>
    ) : enabled.length > 1 ? (
      <>
        <ShieldCheck size={12} className="text-green-400" />
        <span className={"font-medium text-xs"}>
          {enabled.length} Enabled
        </span>
      </>
    ) : null;

  return (
    <div
      className={"flex gap-3"}
      onClick={(e) => {
        e.stopPropagation();
        openModal({ proxy: reverseProxy, initialTab: "auth" });
      }}
    >
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild={true}>
          {badgeContent ? (
            <Badge
              variant={"gray"}
              useHover={false}
              className={"cursor-pointer"}
            >
              {badgeContent}
            </Badge>
          ) : (
            <Badge variant={"gray"}>
              <ShieldOff size={12} className="text-red-500" />
              <span className={"font-medium text-xs"}>None</span>
            </Badge>
          )}
        </HoverCardTrigger>
        {showHoverContent && (
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
            </div>
          </HoverCardContent>
        )}
      </HoverCard>

      <Button
        size={"xs"}
        variant={"secondary"}
        onClick={(e) => {
          e.stopPropagation();
          openModal({ proxy: reverseProxy, initialTab: "auth" });
        }}
        className={"!px-3"}
        disabled={!permission?.services?.update}
      >
        <Settings size={12} />
        Configure
      </Button>
    </div>
  );
}
