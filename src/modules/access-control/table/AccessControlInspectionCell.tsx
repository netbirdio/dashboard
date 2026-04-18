import Badge from "@components/Badge";
import { IconCirclePlus } from "@tabler/icons-react";
import { Eye } from "lucide-react";
import React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};

export default function AccessControlInspectionCell({ policy }: Props) {
  const { permission } = usePermissions();
  const isDisabled = !permission.policies.create || !permission.policies.update;
  const count = policy.inspection_policies?.length ?? 0;

  return count > 0 ? (
    <div className="flex">
      <Badge variant="gray" useHover={true}>
        <Eye size={14} className="text-netbird" />
        {count} Inspection
      </Badge>
    </div>
  ) : (
    <div className="flex">
      <Badge
        variant="gray"
        useHover={!isDisabled}
        onClick={(e) => {
          if (isDisabled) e.stopPropagation();
        }}
        disabled={isDisabled}
      >
        <IconCirclePlus size={14} />
        Add Inspection
      </Badge>
    </div>
  );
}
