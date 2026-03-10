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
  Globe,
  KeyRound,
  LucideIcon,
  Network,
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
import { AccessRestrictions, ReverseProxy, isL4Mode } from "@/interfaces/ReverseProxy";

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

  // L4 services don't support auth, show access restrictions instead
  if (isL4Mode(reverseProxy.mode)) {
    return (
      <L4AccessBadge
        reverseProxy={reverseProxy}
        permission={permission}
        openModal={openModal}
      />
    );
  }

  const auth = reverseProxy.auth;

  const enabled = AUTH_METHODS.filter((m) => auth?.[m.key]?.enabled);
  const headerAuthCount = auth?.header_auths?.length ?? 0;
  const totalEnabled = enabled.length + (headerAuthCount > 0 ? 1 : 0);

  const ssoGroups = auth?.bearer_auth?.enabled
    ? (auth.bearer_auth.distribution_groups ?? [])
        .map((groupId) => groups?.find((g) => g.id === groupId))
        .filter((g): g is Group => g != undefined)
    : [];

  const showHoverContent =
    totalEnabled > 1 || (totalEnabled === 1 && auth?.bearer_auth?.enabled);

  const isSingleStandard = totalEnabled === 1 && enabled.length === 1;
  const SingleIcon = isSingleStandard ? enabled[0].Icon : null;

  const badgeContent =
    isSingleStandard && SingleIcon ? (
      <>
        <SingleIcon size={12} className="text-green-500" />
        <span className={"font-medium text-xs"}>{enabled[0].label}</span>
      </>
    ) : totalEnabled === 1 && headerAuthCount > 0 ? (
      <>
        <KeyRound size={12} className="text-green-500" />
        <span className={"font-medium text-xs"}>Header Auth</span>
      </>
    ) : totalEnabled > 1 ? (
      <>
        <ShieldCheck size={12} className="text-green-400" />
        <span className={"font-medium text-xs"}>
          {totalEnabled} Enabled
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

function hasRestrictions(r?: AccessRestrictions): boolean {
  if (!r) return false;
  return (
    (r.allowed_cidrs?.length ?? 0) > 0 ||
    (r.blocked_cidrs?.length ?? 0) > 0 ||
    (r.allowed_countries?.length ?? 0) > 0 ||
    (r.blocked_countries?.length ?? 0) > 0
  );
}

type L4AccessBadgeProps = {
  reverseProxy: ReverseProxy;
  permission: ReturnType<typeof usePermissions>["permission"];
  openModal: ReturnType<typeof useReverseProxies>["openModal"];
};

function L4AccessBadge({
  reverseProxy,
  permission,
  openModal,
}: Readonly<L4AccessBadgeProps>) {
  const r = reverseProxy.access_restrictions;
  const active = hasRestrictions(r);

  return (
    <div
      className={"flex gap-3"}
      onClick={(e) => {
        e.stopPropagation();
        openModal({ proxy: reverseProxy, initialTab: "access" });
      }}
    >
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild={true}>
          {active ? (
            <Badge variant={"gray"} useHover={false} className={"cursor-pointer"}>
              <ShieldCheck size={12} className="text-green-500" />
              <span className={"font-medium text-xs"}>
                Access Control
              </span>
            </Badge>
          ) : (
            <Badge variant={"gray"}>
              <ShieldOff size={12} className="text-red-500" />
              <span className={"font-medium text-xs"}>No Restrictions</span>
            </Badge>
          )}
        </HoverCardTrigger>
        {active && r && (
          <HoverCardContent
            className={"p-0"}
            sideOffset={14}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={"text-xs"}>
              {(r.allowed_cidrs?.length ?? 0) > 0 && (
                <ListItem
                  className={"py-0.5"}
                  icon={<Network size={14} />}
                  label={`${r.allowed_cidrs!.length} CIDR${r.allowed_cidrs!.length > 1 ? "s" : ""} allowed`}
                  value={<span className="text-green-500">Active</span>}
                />
              )}
              {(r.blocked_cidrs?.length ?? 0) > 0 && (
                <ListItem
                  className={"py-0.5"}
                  icon={<Network size={14} />}
                  label={`${r.blocked_cidrs!.length} CIDR${r.blocked_cidrs!.length > 1 ? "s" : ""} blocked`}
                  value={<span className="text-red-400">Active</span>}
                />
              )}
              {(r.allowed_countries?.length ?? 0) > 0 && (
                <ListItem
                  className={"py-0.5"}
                  icon={<Globe size={14} />}
                  label={`${r.allowed_countries!.length} ${r.allowed_countries!.length > 1 ? "countries" : "country"} allowed`}
                  value={<span className="text-green-500">Active</span>}
                />
              )}
              {(r.blocked_countries?.length ?? 0) > 0 && (
                <ListItem
                  className={"py-0.5"}
                  icon={<Globe size={14} />}
                  label={`${r.blocked_countries!.length} ${r.blocked_countries!.length > 1 ? "countries" : "country"} blocked`}
                  value={<span className="text-red-400">Active</span>}
                />
              )}
            </div>
          </HoverCardContent>
        )}
      </HoverCard>

      <Button
        size={"xs"}
        variant={"secondary"}
        onClick={(e) => {
          e.stopPropagation();
          openModal({ proxy: reverseProxy, initialTab: "access" });
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
