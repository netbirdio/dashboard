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

type Props = {
  value: "full" | "limited";
  onChange: Dispatch<SetStateAction<"full" | "limited">>;
};

export const SSHAccessType = ({ value, onChange }: Props) => {
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
          data-cy={"protocol-select-button"}
        >
          {value === "full" ? (
            <ShieldUserIcon size={15} className={"text-nb-gray-300 shrink-0"} />
          ) : (
            <ShieldHalfIcon size={15} className={"text-nb-gray-300 shrink-0"} />
          )}
          <SelectValue placeholder="Select ssh access type..." />
        </div>
      </SelectTrigger>
      <SelectContent data-cy={"ssh-access-selection"}>
        <SelectItem value="full" className={"whitespace-nowrap"}>
          Full Access
        </SelectItem>
        <SelectItem value="limited" className={"whitespace-nowrap"}>
          Limited Access
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
