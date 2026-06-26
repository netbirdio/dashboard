"use client";

import FullTooltip from "@components/FullTooltip";
import { useTranslations } from "next-intl";
import { TriangleAlertIcon } from "lucide-react";
import * as React from "react";

type Props = {
  size?: number;
};
export const NetworkRoutesDeprecationInfo = ({ size = 14 }: Props) => {
  const t = useTranslations("networks");
  return (
    <FullTooltip
      content={
        <div className={"text-xs max-w-[230px]"}>
          {t("routesDeprecationInfo")}
        </div>
      }
    >
      <TriangleAlertIcon
        size={size}
        className={"text-amber-500 ml-2.5 hover:text-amber-400 cursor-help"}
      />
    </FullTooltip>
  );
};
