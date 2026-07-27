"use client";

import * as React from "react";
import { Dispatch, SetStateAction } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { ShieldHalfIcon, ShieldUserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  value: "full" | "limited";
  onChange: Dispatch<SetStateAction<"full" | "limited">>;
};

export const SSHAccessType = ({ value, onChange }: Props) => {
  const t = useTranslations("policies");
  const { permission } = usePermissions();

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as "full" | "limited")}
      disabled={!permission?.policies?.update || !permission?.policies?.create}
    >
      <SelectTrigger className="w-[280px]">
        <div
          className={"flex items-center gap-3"}
          data-testid={"protocol-select-button"}
        >
          {value === "full" ? (
            <ShieldUserIcon size={15} className={"text-nb-gray-300 shrink-0"} />
          ) : (
            <ShieldHalfIcon size={15} className={"text-nb-gray-300 shrink-0"} />
          )}
          <SelectValue placeholder={t("sshAccessPlaceholder")} />
        </div>
      </SelectTrigger>
      <SelectContent data-testid={"ssh-access-selection"}>
        <SelectItem value="full" className={"whitespace-nowrap"}>
          {t("sshFullAccess")}
        </SelectItem>
        <SelectItem value="limited" className={"whitespace-nowrap"}>
          {t("sshLimitedAccess")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
