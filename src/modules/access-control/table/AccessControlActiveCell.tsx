import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { mutate } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlActiveCell({ policy }: Readonly<Props>) {
  const t = useTranslations();
  const { updatePolicy, serializeRules } = usePolicies();
  const { permission } = usePermissions();

  const isChecked = useMemo(() => {
    return policy.enabled;
  }, [policy]);

  const update = async (enabled: boolean) => {
    updatePolicy(
      policy,
      { enabled, rules: serializeRules(policy.rules, enabled) },
      () => {
        mutate("/policies");
      },
      enabled
        ? t("accessControl.ruleEnabled")
        : t("accessControl.ruleDisabled"),
    );
  };

  return (
    <div className={"flex min-w-[0px]"}>
      <ToggleSwitch
        disabled={!permission.policies.update}
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  );
}
