import { ToggleSwitch } from "@components/ToggleSwitch";
import React, { useMemo } from "react";
import { mutate } from "swr";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { Group } from "@/interfaces/Group";
import { Policy } from "@/interfaces/Policy";

type Props = {
  policy: Policy;
};
export default function AccessControlActiveCell({ policy }: Props) {
  const { updatePolicy } = usePolicies();

  const isChecked = useMemo(() => {
    return policy.enabled;
  }, [policy]);

  const update = async (enabled: boolean) => {
    const rules = [...policy.rules];
    rules.forEach((rule) => {
      rule.enabled = enabled;
      rule.sources = rule.sources
        ? (rule.sources.map((source) => {
            const group = source as Group;
            return group.id;
          }) as string[])
        : [];
      rule.destinations = rule.destinations
        ? (rule.destinations.map((source) => {
            const group = source as Group;
            return group.id;
          }) as string[])
        : [];
    });

    updatePolicy(
      policy,
      { enabled, rules },
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
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  );
}
