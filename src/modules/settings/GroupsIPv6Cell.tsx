import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Trash2 } from "lucide-react";
import React, {useMemo} from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { SetupKey } from "@/interfaces/SetupKey";
import { GroupUsage } from "@/modules/settings/useGroupsUsage";
import {ToggleSwitch} from "@components/ToggleSwitch";
import type {Group, GroupPeer} from "@/interfaces/Group";

type Props = {
  group: GroupUsage;
};
export default function GroupsIPv6Cell({ group }: Props) {
  const updateRequest = useApiCall<Group>("/groups/" + group.id);
  const { mutate } = useSWRConfig();

  const ipv6IsEnabled = useMemo(() => {
    return group.original_group.ipv6_enabled;
  }, [group]);

  const handleIpv6Change = async (newValue: boolean) => {
    return updateRequest.put(
      {
        name: group.name,
        peers: group.original_group.peers?.map((p) => {
            if (typeof p == "string") {
              return p
            } else {
              return p.id
            }
          }),
        ipv6_enabled: newValue
      },
    ).then((g) => {
      mutate("/groups")
    });
  };

  return (
    <div className={"flex min-w-[0px]"}>
      <ToggleSwitch
        checked={ipv6IsEnabled}
        size={"small"}
        onClick={() => handleIpv6Change(!ipv6IsEnabled)}
      ></ToggleSwitch>
    </div>
  );
}
