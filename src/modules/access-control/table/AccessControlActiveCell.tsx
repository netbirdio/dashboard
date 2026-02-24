import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { mutate } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlActiveCell({ policy }: Readonly<Props>) {
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
        ? "The rule was successfully enabled"
        : "The rule was successfully disabled",
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
