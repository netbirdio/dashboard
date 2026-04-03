import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/HoverCard";
import {
  FlagIcon,
  LucideIcon,
  NetworkIcon,
  Settings,
  ShieldCheck,
  ShieldOff,
  WorkflowIcon,
} from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { useCountries } from "@/contexts/CountryProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { ReverseProxy } from "@/interfaces/ReverseProxy";

type RuleEntry = {
  key: string;
  label: string;
  Icon: LucideIcon;
  value: string;
  blocked?: boolean;
};

type Props = {
  reverseProxy: ReverseProxy;
};

export default function ReverseProxyAccessControlCell({
  reverseProxy,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { openModal } = useReverseProxies();
  const { countries } = useCountries();

  const canConfigure = !!permission?.services?.update;
  const restrictions = reverseProxy.access_restrictions;

  const ruleCount =
    (restrictions?.allowed_cidrs?.length ?? 0) +
    (restrictions?.blocked_cidrs?.length ?? 0) +
    (restrictions?.allowed_countries?.length ?? 0) +
    (restrictions?.blocked_countries?.length ?? 0);

  const rulesBadge =
    ruleCount > 0 ? (
      <Badge
        variant={"gray"}
        disabled={!canConfigure}
        className={
          "cursor-pointer !rounded-r-none !border-r-0 !h-[34px] min-w-[100px] !justify-start hover:bg-nb-gray-930 transition-all"
        }
      >
        <ShieldCheck size={12} className="text-green-500" />
        <span className={"font-medium text-xs"}>
          {ruleCount} {ruleCount === 1 ? "Rule" : "Rules"}
        </span>
      </Badge>
    ) : null;

  const ruleGroups = useMemo(() => {
    const getCountryName = (code: string) => {
      const country = countries?.find((c) => c.country_code === code);
      return country?.country_name ?? code;
    };

    const entries: RuleEntry[] = [];

    if (restrictions?.allowed_countries?.length) {
      entries.push({
        key: "allowed-countries",
        label: "Allowed Countries",
        Icon: FlagIcon,
        value: restrictions.allowed_countries.map(getCountryName).join(", "),
      });
    }

    if (restrictions?.blocked_countries?.length) {
      entries.push({
        key: "blocked-countries",
        label: "Blocked Countries",
        Icon: FlagIcon,
        value: restrictions.blocked_countries.map(getCountryName).join(", "),
        blocked: true,
      });
    }

    const allowedIps =
      restrictions?.allowed_cidrs?.filter((c) => c.endsWith("/32")) ?? [];
    const allowedCidrs =
      restrictions?.allowed_cidrs?.filter((c) => !c.endsWith("/32")) ?? [];
    const blockedIps =
      restrictions?.blocked_cidrs?.filter((c) => c.endsWith("/32")) ?? [];
    const blockedCidrs =
      restrictions?.blocked_cidrs?.filter((c) => !c.endsWith("/32")) ?? [];

    if (allowedIps.length) {
      entries.push({
        key: "allowed-ips",
        label: allowedIps.length === 1 ? "Allowed IP" : "Allowed IPs",
        Icon: WorkflowIcon,
        value: allowedIps.map((c) => c.replace(/\/32$/, "")).join(", "),
      });
    }

    if (allowedCidrs.length) {
      entries.push({
        key: "allowed-cidrs",
        label: allowedCidrs.length === 1 ? "Allowed CIDR" : "Allowed CIDRs",
        Icon: NetworkIcon,
        value: allowedCidrs.join(", "),
      });
    }

    if (blockedIps.length) {
      entries.push({
        key: "blocked-ips",
        label: blockedIps.length === 1 ? "Blocked IP" : "Blocked IPs",
        Icon: WorkflowIcon,
        value: blockedIps.map((c) => c.replace(/\/32$/, "")).join(", "),
        blocked: true,
      });
    }

    if (blockedCidrs.length) {
      entries.push({
        key: "blocked-cidrs",
        label: blockedCidrs.length === 1 ? "Blocked CIDR" : "Blocked CIDRs",
        Icon: NetworkIcon,
        value: blockedCidrs.join(", "),
        blocked: true,
      });
    }

    return entries;
  }, [restrictions, countries]);

  const showRulesHover = ruleGroups.length > 0;

  return (
    <div
      className={"flex"}
      onClick={(e) => {
        e.stopPropagation();
        if (permission?.services?.update) {
          openModal({ proxy: reverseProxy, initialTab: "access-control" });
        }
      }}
    >
      <div className={"flex items-center"}>
        {rulesBadge ? (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild={true}>{rulesBadge}</HoverCardTrigger>
            {showRulesHover && (
              <HoverCardContent
                className={"p-0"}
                sideOffset={14}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={"text-xs"}>
                  {ruleGroups.map(({ key, label, Icon, value, blocked }) => (
                    <div
                      key={key}
                      className={
                        "flex justify-between gap-12 py-2 px-4 border-b border-nb-gray-920 last:border-b-0"
                      }
                    >
                      <div
                        className={
                          "flex items-start gap-2 font-medium whitespace-nowrap text-nb-gray-100 pt-0.5"
                        }
                      >
                        <Icon
                          size={14}
                          className={
                            blocked ? "text-red-500" : "text-green-500"
                          }
                        />
                        {label}
                      </div>
                      <div
                        className={"max-w-[200px] text-nb-gray-300 text-right"}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </HoverCardContent>
            )}
          </HoverCard>
        ) : (
          <Badge
            variant={"gray"}
            disabled={!canConfigure}
            className={
              "cursor-pointer !rounded-r-none !border-r-0 !h-[34px] min-w-[100px] !justify-start hover:bg-nb-gray-930 transition-all"
            }
          >
            <ShieldOff size={12} className="text-red-500" />
            <span className={"font-medium text-xs"}>No Rules</span>
          </Badge>
        )}
        <Button
          size={"xs"}
          variant={"secondary"}
          className={"!rounded-l-none !px-3 !h-[34px]"}
          onClick={(e) => {
            e.stopPropagation();
            openModal({ proxy: reverseProxy, initialTab: "access-control" });
          }}
          disabled={!permission?.services?.update}
          aria-label="Configure access control"
        >
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
}
