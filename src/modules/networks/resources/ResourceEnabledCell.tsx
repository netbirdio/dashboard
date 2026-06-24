"use client";

import { notify } from "@components/Notification";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { useTranslations } from "next-intl";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

type Props = {
  resource: NetworkResource;
  mutateAllResourcesOnUpdate?: boolean;
};
export const ResourceEnabledCell = ({
  resource,
  mutateAllResourcesOnUpdate,
}: Props) => {
  const t = useTranslations("networks");
  const { permission } = usePermissions();

  const { mutate } = useSWRConfig();
  const { network } = useNetworksContext();

  const update = useApiCall<NetworkResource>(
    `/networks/${network?.id}/resources/${resource?.id}`,
  ).put;

  const toggle = async (enabled: boolean) => {
    notify({
      title: t("updateResource"),
      description: enabled
        ? t("resourceNowEnabled", { name: resource?.name })
        : t("resourceNowDisabled", { name: resource?.name }),
      loadingMessage: t("updatingResource"),
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
        mutateAllResourcesOnUpdate && mutate("/networks/resources");
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
        disabled={!permission.networks.update}
      />
    </div>
  );
};
