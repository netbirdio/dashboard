import Badge from "@components/Badge";
import { IconCirclePlus } from "@tabler/icons-react";
import { ShieldCheck } from "lucide-react";
import React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlPostureCheckCell({ policy }: Props) {
  const t = useTranslations();
  const { permission } = usePermissions();

  const isDisabled = !permission.policies.create || !permission.policies.update;

  return policy.source_posture_checks &&
    policy.source_posture_checks.length > 0 ? (
    <div className={"flex"}>
      <Badge variant={"gray"} useHover={true}>
        <ShieldCheck size={14} className={"text-green-500"} />
        {policy.source_posture_checks.length} Posture Check(s)
      </Badge>
    </div>
  ) : (
    <div className={"flex"}>
      <Badge
        variant={"gray"}
        useHover={!isDisabled}
        onClick={(e) => {
          if (isDisabled) e.stopPropagation();
        }}
        disabled={isDisabled}
      >
        <IconCirclePlus size={14} />
        {t("accessControl.addPostureCheck")}
      </Badge>
    </div>
  );
}
