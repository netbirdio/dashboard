import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { NameserverGroup } from "@/interfaces/Nameserver";

type Props = {
  ns: NameserverGroup;
};
export default function NameserverActiveCell({ ns }: Readonly<Props>) {
  const nsRequest = useApiCall<NameserverGroup>("/dns/nameservers");
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();

  const update = async (enabled: boolean) => {
    notify({
      title: ns.name,
      description:
        "Nameserver was successfully" +
        (enabled ? " enabled" : " disabled") +
        ".",
      loadingMessage: "Updating your nameserver...",
      promise: nsRequest
        .put(
          {
            name: ns.name,
            description: ns.description,
            nameservers: ns.nameservers,
            enabled: enabled,
            groups: ns.groups,
            primary: ns.primary,
            domains: ns.domains,
            search_domains_enabled: ns.search_domains_enabled,
          },
          `/${ns?.id}`,
        )
        .then(() => {
          mutate("/dns/nameservers");
        }),
    });
  };

  const isChecked = useMemo(() => {
    return ns.enabled;
  }, [ns]);

  return (
    <div className={"flex"}>
      <ToggleSwitch
        disabled={!permission.nameservers.update}
        checked={isChecked}
        size={"small"}
        onClick={() => update(!isChecked)}
      />
    </div>
  );
}
