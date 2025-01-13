import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
};
export const ResourceEnabledCell = ({ resource }: Props) => {
  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const update = useApiCall<NetworkResource>(
    `/networks/${network?.id}/resources/${resource?.id}`,
  ).put;

  const toggle = async (enabled: boolean) => {
    notify({
      title: `Update Resource`,
      description: `'${resource?.name}' is now ${
        enabled ? "enabled" : "disabled"
      }`,
      loadingMessage: "Updating resource...",
      duration: 1200,
      promise: update({
        ...resource,
        groups: resource.groups
          ?.map((g) => {
            let group = g as Group;
            return group.id;
          })
          .filter((g) => g !== undefined),
        enabled,
      }).then(() => {
        mutate(`/networks/${network?.id}/resources`);
      }),
    });
  };

  const isChecked = useMemo(() => {
    return resource.enabled;
  }, [resource]);

  return (
    <div className={"flex"}>
      <ToggleSwitch
        checked={isChecked}
        size={"small"}
        onClick={() => toggle(!isChecked)}
      />
    </div>
  );
};
