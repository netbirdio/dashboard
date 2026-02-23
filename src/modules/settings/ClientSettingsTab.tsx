import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { useHasChanges } from "@hooks/useHasChanges";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import {
  ClockFadingIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  MonitorSmartphoneIcon,
  RefreshCcw,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { SmallBadge } from "@components/ui/SmallBadge";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useGroups } from "@/contexts/GroupsProvider";
import { SkeletonSettings } from "@components/skeletons/SkeletonSettings";

type Props = {
  account: Account;
};

const latestOrCustomVersion = [
  {
    label: "Disabled",
    value: "disabled",
  },
  {
    label: "Latest Version",
    value: "latest",
  },
  {
    label: "Custom Version",
    value: "custom",
  },
] as SelectOption[];

export default function ClientSettingsTab({ account }: Readonly<Props>) {
  const { isLoading: isGroupsLoading } = useGroups();

  return isGroupsLoading ? (
    <SkeletonSettings />
  ) : (
    <ClientSettingsTabContent account={account} />
  );
}

function ClientSettingsTabContent({ account }: Readonly<Props>) {
  const { permission } = usePermissions();

  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [lazyConnection, setLazyConnection] = useState(
    account.settings?.lazy_connection_enabled ?? false,
  );

  const autoUpdateSetting = account.settings?.auto_update_version;
  const isAutoUpdateEnabled =
    !!autoUpdateSetting && autoUpdateSetting !== "disabled";
  const isCustomVersion = validator.isValidVersion(autoUpdateSetting);
  const [autoUpdateMethod, setAutoUpdateMethod] = useState(
    isAutoUpdateEnabled ? (isCustomVersion ? "custom" : "latest") : "disabled",
  );

  const [autoUpdateCustomVersion, setAutoUpdateCustomVersion] = useState(
    isCustomVersion ? autoUpdateSetting : "",
  );

  const [peerExposeEnabled, setPeerExposeEnabled] = useState<boolean>(
    account?.settings?.extra?.peer_expose_enabled ?? false,
  );
  const [peerExposeGroups, setPeerExposeGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: account.settings?.extra?.peer_expose_groups,
    });
  const peerExposeGroupNames = useMemo(
    () => peerExposeGroups.map((g) => g.name).sort(),
    [peerExposeGroups],
  );

  const { hasChanges, updateRef } = useHasChanges([
    autoUpdateMethod,
    autoUpdateCustomVersion,
    peerExposeEnabled,
    peerExposeGroupNames,
  ]);

  const handleUpdateMethodChange = (value: string) => {
    setAutoUpdateMethod(value);
    if (value === "disabled" || value === "latest") {
      setAutoUpdateCustomVersion("");
    }
  };

  const versionError = useMemo(() => {
    const msg = "Please enter a valid version, e.g., 0.2, 0.2.0, 0.2.0-alpha.1";
    if (autoUpdateCustomVersion == "") return "";
    if (autoUpdateCustomVersion == "-") return "";
    const validSemver = validator.isValidVersion(autoUpdateCustomVersion);
    if (!validSemver) return msg;
    return "";
  }, [autoUpdateCustomVersion]);

  const canSaveCustomVersion =
    autoUpdateCustomVersion !== "" &&
    autoUpdateMethod === "custom" &&
    versionError === "";

  const isSaveButtonDisabled = useMemo(() => {
    return (
      !hasChanges ||
      !permission.settings.update ||
      (autoUpdateMethod === "custom" && !canSaveCustomVersion) ||
      (peerExposeEnabled && peerExposeGroups.length === 0)
    );
  }, [
    hasChanges,
    permission.settings.update,
    autoUpdateMethod,
    canSaveCustomVersion,
    peerExposeEnabled,
    peerExposeGroups,
  ]);

  const saveChanges = async () => {
    const groups = await saveGroups();
    const peerExposeGroupIds = groups
      .map((group) => group.id)
      .filter(Boolean) as string[];

    notify({
      title: "Client Settings",
      description: `Client settings successfully updated.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            auto_update_version: autoUpdateCustomVersion || autoUpdateMethod,
            extra: {
              ...account.settings?.extra,
              peer_expose_enabled: peerExposeEnabled,
              peer_expose_groups: peerExposeGroupIds,
            },
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([
            autoUpdateMethod,
            autoUpdateCustomVersion,
            peerExposeEnabled,
            peerExposeGroupNames,
          ]);
        }),
      loadingMessage: "Updating client settings...",
    });
  };

  const toggleLazyConnection = async (toggle: boolean) => {
    notify({
      title: "Lazy Connections",
      description: `Lazy Connections successfully ${
        toggle ? "enabled" : "disabled"
      }.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            lazy_connection_enabled: toggle,
          },
        })
        .then(() => {
          setLazyConnection(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Updating Lazy Connections setting...",
    });
  };

  return (
    <Tabs.Content value={"clients"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=clients"}
            label={"Clients"}
            icon={<MonitorSmartphoneIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>Clients</h1>
          <Button
            variant={"primary"}
            disabled={isSaveButtonDisabled}
            onClick={saveChanges}
            data-cy={"save-clients-settings"}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-10 w-full mt-8"}>
          <div className={"flex flex-col relative"}>
            <Label>
              <RefreshCcw size={15} />
              Automatic Updates
              <SmallBadge
                text={"Beta"}
                variant={"sky"}
                className={"text-[9px] leading-none py-[3px] px-[5px]"}
                textClassName={"top-0"}
              />
            </Label>
            <HelpText>
              Select how NetBird clients handle automatic updates by choosing
              the latest version, a custom version, or disabling updates
              altogether. Automatic Updates require at least NetBird{" "}
              <span className={"text-white font-medium"}>v0.61.0</span>.{" "}
              <InlineLink
                href={"https://docs.netbird.io/manage/peers/auto-update"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </HelpText>
            <div className={"gap-4 items-center grid grid-cols-2"}>
              <SelectDropdown
                value={autoUpdateMethod}
                onChange={handleUpdateMethodChange}
                options={latestOrCustomVersion}
              />
              <Input
                value={autoUpdateCustomVersion}
                customPrefix={"Version"}
                placeholder={"e.g., 0.52.2"}
                error={versionError}
                errorTooltip={true}
                disabled={autoUpdateMethod !== "custom"}
                onChange={(v) => {
                  setAutoUpdateCustomVersion(v.target.value);
                }}
              />
            </div>
          </div>

          <div>
            <div>
              <Label>
                <ReverseProxyIcon size={15} className={"fill-nb-gray-300"} />
                Expose Services from CLI
              </Label>
              <HelpText>
                Allow peers to expose local services through the NetBird reverse
                proxy using the CLI. <br /> This requires at least NetBird{" "}
                <span className={"text-white font-medium"}>v0.66.0</span>.{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/manage/reverse-proxy/expose-from-cli"
                  }
                  target={"_blank"}
                >
                  Learn more
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </HelpText>
            </div>

            <FancyToggleSwitch
              className={"mt-2"}
              value={peerExposeEnabled}
              onChange={setPeerExposeEnabled}
              label={"Enable Peer Expose"}
              helpText={
                "When enabled, peers can expose local HTTP services accessible via a public URL."
              }
              disabled={!permission.settings.update}
            />

            <div
              className={cn(
                "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
                !peerExposeEnabled
                  ? "opacity-50 pointer-events-none"
                  : "bg-nb-gray-930/80",
              )}
            >
              <div className={"mt-2"}>
                <Label>Allowed peer groups</Label>
                <HelpText>
                  Select which peer groups are allowed to expose services. At
                  least one group is required.
                </HelpText>
                <PeerGroupSelector
                  values={peerExposeGroups}
                  onChange={setPeerExposeGroups}
                  placeholder="Select peer groups..."
                />
              </div>
            </div>
          </div>

          <div>
            <Label>
              <FlaskConicalIcon size={15} />
              Experimental
            </Label>

            <HelpText>
              Lazy connections are an experimental feature. Functionality and
              behavior may evolve. Instead of maintaining always-on connections,
              NetBird activates them on-demand based on activity or signaling.{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/lazy-connection"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </HelpText>
            <FancyToggleSwitch
              className={"mt-2"}
              value={lazyConnection}
              onChange={toggleLazyConnection}
              label={
                <>
                  <ClockFadingIcon size={15} />
                  Enable Lazy Connections
                </>
              }
              helpText={
                <>
                  Allow to establish connections between peers only when
                  required. This requires NetBird client v0.45 or higher.
                  Changes will only take effect after restarting the clients.
                </>
              }
              disabled={!permission.settings.update}
            />
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
}
