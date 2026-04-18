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
  FileCode2Icon,
  HelpCircle,
  LockKeyhole,
  LockOpenIcon,
  RectangleEllipsis,
  Settings,
  Users,
} from "lucide-react";
import * as React from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { isL4Mode, ReverseProxy } from "@/interfaces/ReverseProxy";
import FullTooltip from "@components/FullTooltip";

const HEADER_AUTH_METHOD = {
  label: "HTTP Headers",
  hoverLabel: "HTTP Headers",
  Icon: FileCode2Icon,
};

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyAuthCell({
  reverseProxy,
}: Readonly<Props>) {
  const { t } = useI18n();
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const { groups } = useGroups();

  if (isL4Mode(reverseProxy.mode)) {
    return (
      <div className={"flex"}>
        <FullTooltip
          content={
            <div className={"flex text-xs max-w-[340px]"}>
              {t("reverseProxy.authNotSupported")}
            </div>
          }
        >
          <Badge variant={"gray"}>
            {t("remoteAccess.notAvailable")}
            <HelpCircle size={12} />
          </Badge>
        </FullTooltip>
      </div>
    );
  }

  const auth = reverseProxy.auth;
  const authMethods = [
    {
      key: "password_auth" as const,
      label: t("reverseProxy.authMethodPassword"),
      hoverLabel: t("reverseProxy.authMethodPassword"),
      Icon: RectangleEllipsis,
    },
    {
      key: "pin_auth" as const,
      label: t("reverseProxy.authMethodPin"),
      hoverLabel: t("reverseProxy.authMethodPin"),
      Icon: Binary,
    },
    {
      key: "bearer_auth" as const,
      label: t("reverseProxy.authMethodSso"),
      hoverLabel: t("reverseProxy.authMethodSsoFull"),
      Icon: Users,
    },
  ];

  const enabled = authMethods.filter((m) => auth?.[m.key]?.enabled);
  const hasHeaderAuths = (auth?.header_auths ?? []).some((h) => h.enabled);
  const authCount = enabled.length + (hasHeaderAuths ? 1 : 0);

  const ssoGroups = auth?.bearer_auth?.enabled
    ? (auth.bearer_auth.distribution_groups ?? [])
        .map((groupId) => groups?.find((g) => g.id === groupId))
        .filter((g): g is Group => g != undefined)
    : [];

  const canConfigure = !!permission?.services?.update;
  const singleAuth =
    authCount === 1
      ? enabled.length === 1
        ? enabled[0]
      : {
          ...HEADER_AUTH_METHOD,
          label: t("reverseProxy.authMethodHeaders"),
          hoverLabel: t("reverseProxy.authMethodHeaders"),
        }
      : null;
  const SingleAuthIcon = singleAuth?.Icon ?? null;

  const authBadge = SingleAuthIcon ? (
    <Badge
      variant={"gray"}
      useHover={false}
      disabled={!canConfigure}
      className={"cursor-pointer !rounded-r-none !border-r-0 !h-[34px] min-w-[100px] !justify-start hover:bg-nb-gray-930 transition-all"}
    >
      <SingleAuthIcon size={12} className="text-green-500" />
      <span className={"font-medium text-xs"}>{singleAuth!.label}</span>
    </Badge>
  ) : authCount > 1 ? (
    <Badge
      variant={"gray"}
      useHover={false}
      disabled={!canConfigure}
      className={"cursor-pointer !rounded-r-none !border-r-0 !h-[34px] min-w-[100px] !justify-start hover:bg-nb-gray-930 transition-all"}
    >
      <LockKeyhole size={12} className="text-green-500" />
      <span className={"font-medium text-xs"}>
        {t("reverseProxy.authEnabledCount", { count: authCount })}
      </span>
    </Badge>
  ) : null;

  const showAuthHover =
    authCount > 1 || (authCount === 1 && (auth?.bearer_auth?.enabled || hasHeaderAuths));

  return (
    <div className={"flex"} onClick={(e) => {
      e.stopPropagation();
      if (permission?.services?.update) {
        openModal({ proxy: reverseProxy, initialTab: "auth" });
      }
    }}>
      <div className={"flex items-center"}>
        {authBadge ? (
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
                            ? t("reverseProxy.allUsers")
                            : t("filters.enabled")}
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
                          {t("reverseProxy.headersEnabledCount", {
                            count: (auth?.header_auths ?? []).filter(
                              (h) => h.enabled,
                            ).length,
                          })}
                        </div>
                      }
                    />
                  )}
                </div>
              </HoverCardContent>
            )}
          </HoverCard>
        ) : (
          <Badge
            variant={"gray"}
            disabled={!canConfigure}
            className={"cursor-pointer !rounded-r-none !border-r-0 !h-[34px] min-w-[100px] !justify-start hover:bg-nb-gray-930 transition-all"}
          >
            <LockOpenIcon size={12} className="text-red-500" />
            <span className={"font-medium text-xs"}>
              {t("reverseProxy.noAuth")}
            </span>
          </Badge>
        )}
        <Button
          size={"xs"}
          variant={"secondary"}
          className={"!rounded-l-none !px-3 !h-[34px]"}
          onClick={(e) => {
            e.stopPropagation();
            openModal({ proxy: reverseProxy, initialTab: "auth" });
          }}
          disabled={!permission?.services?.update}
          aria-label={t("reverseProxy.configureAuthentication")}
        >
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
}
