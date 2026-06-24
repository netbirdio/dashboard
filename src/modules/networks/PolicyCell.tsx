"use client";

import Badge from "@components/Badge";
import Button from "@components/Button";
import { useTranslations } from "next-intl";
import { PlusCircle, ShieldIcon } from "lucide-react";
import * as React from "react";

type Props = {
  count: number;
};

export const PolicyCell = ({ count }: Props) => {
  const t = useTranslations("networks");
  const tCommon = useTranslations("common");

  return count > 0 ? (
    <div className={"flex gap-3"}>
      <Badge variant={"gray"} useHover={true}>
        <ShieldIcon size={14} className={"text-green-500"} />
        <div>
          <span className={"font-medium"}>{count}</span> {t("accessPolicies")}
        </div>
      </Badge>
      <Button size={"xs"} variant={"secondary"} className={"min-w-[130px]"}>
        <PlusCircle size={12} />
        {tCommon("create")}
      </Button>
    </div>
  ) : (
    <Button size={"xs"} variant={"secondary"} className={"min-w-[130px]"}>
      <PlusCircle size={12} />
      {tCommon("create")}
    </Button>
  );
};
