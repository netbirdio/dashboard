"use client";

import { DomainListBadge } from "@components/ui/DomainListBadge";
import { IconDirectionSign } from "@tabler/icons-react";
import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";

type Props = {
  network?: string;
  domains?: string[];
};
export default function NetworkRangeCell({ network, domains }: Props) {
  const t = useTranslations("networks");
  const isExitNode = network === "0.0.0.0/0";
  const hasDomains = domains ? domains.length > 0 : false;

  return hasDomains && domains ? (
    <DomainListBadge domains={domains} />
  ) : isExitNode ? (
    <ExitNodeHelpTooltip>
      <div className={"flex gap-2 items-center dark:text-nb-gray-300 group"}>
        <IconDirectionSign size={16} className={"text-yellow-400"} />
        {t("exitNode")}{" "}
        <InfoIcon
          size={14}
          className={
            "text-nb-gray-500 group-hover:text-nb-gray-400 transition-all"
          }
        />
      </div>
    </ExitNodeHelpTooltip>
  ) : (
    <div className={"font-mono dark:text-nb-gray-300 flex"}>{network}</div>
  );
}
