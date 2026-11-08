"use client";

import Badge from "@components/Badge";
import { useTranslations } from "next-intl";
import { NetworkIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";

type Props = {
  single: boolean;
};
export default function ResourceTypeCell({ single }: Props) {
  const t = useTranslations("networks");
  return (
    <div className={"inline-flex"}>
      {single ? (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <WorkflowIcon size={14} /> {t("singleIP")}
        </Badge>
      ) : (
        <Badge variant={"gray"} className={"min-w-[130px]"}>
          <NetworkIcon size={14} /> {t("ipRange")}
        </Badge>
      )}
    </div>
  );
}
