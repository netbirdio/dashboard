import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { useHasChanges } from "@hooks/useHasChanges";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import {
  ArrowLeftRightIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { LockedFeatureBadge } from "@/modules/billing/locked-feature/LockedFeatureBadge";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  account: Account;
};

export const TRAFFIC_EVENTS_DOC_LINK =
  "https://docs.netbird.io/how-to/traffic-events-logging";

export const TrafficEventSetting = ({ account }: Props) => {
  const { permission } = usePermissions();
  const { groups } = useGroups();
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const [trafficEventsEnabled, setTrafficEventsEnabled] = useState(
    account.settings?.extra?.network_traffic_logs_enabled ?? false,
  );

  const [trafficPacketCounterEnabled, setTrafficPacketCounterEnabled] =
    useState(
      account.settings?.extra?.network_traffic_packet_counter_enabled ?? false,
    );

  const toggleTrafficEvents = async (toggle: boolean) => {
    if (!toggle) {
      setTrafficPacketCounterEnabled(false);
    }
    notify({
      title: "Traffic Events",
      description: `Traffic events successfully ${
        toggle ? "enabled" : "disabled"
      }.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            extra: {
              ...account.settings?.extra,
              network_traffic_logs_enabled: toggle,
              network_traffic_packet_counter_enabled: !toggle
                ? false
                : trafficPacketCounterEnabled,
            },
          },
        })
        .then(() => {
          setTrafficEventsEnabled(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Updating traffic events setting...",
    });
  };

  const toggleTrafficPacketCounter = async (toggle: boolean) => {
    let choice = false;
    if (toggle) {
      choice = await confirm({
        title: "Enable Traffic Reporting (Kernel)?",
        description:
          "Note: Enabling this setting will lead to a higher CPU usage than usual on the NetBird client.",
        confirmText: "Enable",
        cancelText: "Cancel",
        type: "default",
      });
      if (!choice) return;
    }

    notify({
      title: "Traffic Reporting",
      description: `Traffic reporting successfully ${
        toggle ? "enabled" : "disabled"
      }.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            extra: {
              ...account.settings?.extra,
              network_traffic_packet_counter_enabled: toggle,
            },
          },
        })
        .then(() => {
          setTrafficPacketCounterEnabled(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Updating traffic reporting setting...",
    });
  };

  return (
    <>
      <div className={"mt-4"}>
        <h2 className={"text-lg font-medium"}>
          Experimental
          <FlaskConicalIcon
            size={16}
            className={"inline ml-1.5 relative -top-[2px]"}
          />
        </h2>
        <div className={"text-sm text-gray-400"}>
          Traffic events is an experimental feature. Functionality and behavior
          may evolve, including changes to how data is collected or reported.
          Traffic events data retention is limited to 48 hours and capped at a
          maximum of 50,000 events.{" "}
          <InlineLink href={TRAFFIC_EVENTS_DOC_LINK} target={"_blank"}>
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </div>
      </div>
      <div className={"relative"}>
        <LockedFeatureBadge
          center={true}
          featureText={"Traffic Events"}
          feature={"TRAFFIC_EVENTS"}
          disabled={trafficEventsEnabled}
        >
          <div className={"flex flex-col relative mb-4"}>
            <FancyToggleSwitch
              value={trafficEventsEnabled}
              onChange={toggleTrafficEvents}
              data-testid="traffic-events"
              label={
                <>
                  <ArrowLeftRightIcon size={15} />
                  Enable Traffic Events
                </>
              }
              helpText={
                <>
                  Enable traffic events for all peers. This requires NetBird
                  client v0.39 or higher.
                </>
              }
              disabled={!permission.settings.update}
            />

            <div
              className={cn(
                "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
                !trafficEventsEnabled
                  ? "opacity-50 pointer-events-none"
                  : "bg-nb-gray-930/80",
              )}
            >
              <FancyToggleSwitch
                variant={"blank"}
                className={"mt-2"}
                value={trafficPacketCounterEnabled}
                onChange={toggleTrafficPacketCounter}
                data-testid="traffic-reporting-kernel"
                label={<>Enable Traffic Reporting (Kernel)</>}
                helpText={
                  <>
                    Traffic reporting is always enabled in userspace, and this
                    setting only applies to kernel. If enabled, network packets
                    and their size will be counted and reported.
                  </>
                }
                disabled={!permission.settings.update}
              />
              <div className={"mt-2"}>
                <Label>Limit To Specific Groups</Label>
                <HelpText className={"mb-3"}>
                  Select peer groups for which traffic events will be logged.{" "}
                  <br />
                  If no group is selected, logging applies to all peers.
                </HelpText>
                {!groups ? (
                  <Skeleton height={46} />
                ) : (
                  <TrafficEventGroupsSetting account={account} />
                )}
              </div>
            </div>
          </div>
        </LockedFeatureBadge>
      </div>
    </>
  );
};

type TrafficEventGroupsSettingProps = {
  account: Account;
};

export const TrafficEventGroupsSetting = ({
  account,
}: TrafficEventGroupsSettingProps) => {
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);
  const { mutate } = useSWRConfig();

  const [trafficGroups, setTrafficGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: account.settings?.extra?.network_traffic_logs_groups,
    });

  const { hasChanges, updateRef } = useHasChanges([trafficGroups]);

  const saveTrafficGroups = async () => {
    const groups = await saveGroups();
    const groupIds = groups.map((group) => group.id) as string[];

    notify({
      title: "Traffic Events Groups",
      description: "Traffic events groups successfully updated.",
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            extra: {
              ...account.settings?.extra,
              network_traffic_logs_groups: groupIds || [],
            },
          },
        })
        .then(() => {
          setTrafficGroups(groups);
          updateRef([groups]);
          mutate("/accounts");
        }),
      loadingMessage: "Updating traffic events groups...",
    });
  };

  return (
    <div className={"flex gap-4 items-end justify-end"}>
      <PeerGroupSelector
        onChange={setTrafficGroups}
        values={trafficGroups}
        hideAllGroup={true}
        showResources={false}
        showResourceCounter={false}
        placeholderForSearch={"Select groups to log traffic events for..."}
        data-testid="traffic-events-groups-selector"
      />
      <Button
        variant={"input"}
        className={"h-[45px]"}
        disabled={!hasChanges}
        onClick={saveTrafficGroups}
        data-testid="save-traffic-groups"
      >
        Save Groups
      </Button>
    </div>
  );
};
