import Badge from "@components/Badge";
import { HoverCard, HoverCardTrigger } from "@components/HoverCard";
import React, { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Policy } from "@/interfaces/Policy";
import { parsePortsToStrings } from "@/modules/access-control/useAccessControl";
import { AccessControlRulesOverviewHoverContent } from "@/modules/access-control/table/AccessControlRuleEndpointCell";

type Props = {
  policy: Policy;
  visiblePorts?: number;
};

export default function AccessControlPortsCell({
  policy,
  visiblePorts = 2,
}: Readonly<Props>) {
  const { t } = useI18n();
  const allPorts = useMemo(() => {
    const ports = policy.rules?.flatMap((rule) => {
      const parsed = parsePortsToStrings(rule);
      return parsed.length === 0 ? [t("filters.all")] : parsed;
    });
    return [...new Set(ports)];
  }, [policy.rules, t]);

  const visiblePortsList = useMemo(() => {
    return allPorts?.slice(0, visiblePorts) ?? [];
  }, [allPorts, visiblePorts]);

  const otherPorts = useMemo(() => {
    return allPorts?.slice(visiblePorts) ?? [];
  }, [allPorts, visiblePorts]);

  if (allPorts.length === 0) return null;

  return (
    <div className={"flex-1"}>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger>
          <div className={"inline-flex items-center gap-2"}>
            {visiblePortsList?.map((port) => (
              <Badge
                key={port}
                variant={"gray"}
                className={
                  "px-3 gap-2 whitespace-nowrap uppercase tracking-wider font-medium"
                }
              >
                {port}
              </Badge>
            ))}

            {otherPorts && otherPorts.length > 0 && (
              <Badge
                variant={"gray-ghost"}
                useHover={true}
                className={
                  "px-3 gap-2 whitespace-nowrap uppercase tracking-wider font-medium"
                }
              >
                + {otherPorts.length}
              </Badge>
            )}
          </div>
        </HoverCardTrigger>
        <AccessControlRulesOverviewHoverContent
          policy={policy}
          disableRedirect={false}
        />
      </HoverCard>
    </div>
  );
}
