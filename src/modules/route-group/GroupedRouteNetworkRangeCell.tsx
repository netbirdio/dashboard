"use client";

import { DomainListBadge } from "@components/ui/DomainListBadge";
import { IconDirectionSign } from "@tabler/icons-react";
import { InfoIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "next-intl";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";

type Props = {
  network?: string;
  domains?: string[];
};
export default function GroupedRouteNetworkRangeCell({
  network,
  domains,
}: Props) {
  const t = useTranslations("routes");
  const isExitNode = network === "0.0.0.0/0";
  const hasDomains = domains ? domains.length > 0 : false;

  return hasDomains && domains ? (
    <DomainListBadge domains={domains} />
  ) : isExitNode ? (
    <ExitNodeHelpTooltip>
      <div className={"flex gap-2 items-center dark:text-nb-gray-300 group"}>
        <IconDirectionSign size={16} className={"text-yellow-400"} />
        {t("exitNodeLabel")}{" "}
        <InfoIcon
          size={14}
          className={
            "text-nb-gray-500 group-hover:text-nb-gray-400 transition-all"
          }
        />
      </div>
    </ExitNodeHelpTooltip>
  ) : (
    <div className={"font-mono dark:text-nb-gray-300 flex max-w-[10px]"}>
      {network}
    </div>
  );
}
