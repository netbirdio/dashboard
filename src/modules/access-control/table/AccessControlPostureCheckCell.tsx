import Badge from "@components/Badge";
import { IconCirclePlus } from "@tabler/icons-react";
import { ShieldCheck } from "lucide-react";
import React from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlPostureCheckCell({ policy }: Props) {
  const { permission } = usePermissions();
  const { t } = useI18n();

  const isDisabled = !permission.policies.create || !permission.policies.update;

  return policy.source_posture_checks &&
    policy.source_posture_checks.length > 0 ? (
    <div className={"flex"}>
      <Badge variant={"gray"} useHover={true}>
        <ShieldCheck size={14} className={"text-green-500"} />
        {t("accessControl.postureChecksCount", {
          count: policy.source_posture_checks.length,
        })}
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
