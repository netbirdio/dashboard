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
import { Callout } from "@components/Callout";
import { useHasChanges } from "@hooks/useHasChanges";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import {
  ClockFadingIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  MonitorSmartphoneIcon,
  AlertTriangle,
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

  const [autoUpdateAlways, setAutoUpdateAlways] = useState(
    account.settings?.auto_update_always ?? false,
  );

  const [peerExposeEnabled, setPeerExposeEnabled] = useState<boolean>(
    account?.settings?.peer_expose_enabled ?? false,
  );
  const [peerExposeGroups, setPeerExposeGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: account.settings?.peer_expose_groups,
    });
  const peerExposeGroupNames = useMemo(
    () => peerExposeGroups.map((g) => g.name).sort(),
    [peerExposeGroups],
  );

  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(
    account?.settings?.recording_enabled ?? false,
  );
  const [
    recordingGroups,
    setRecordingGroups,
    { save: saveRecordingGroups },
  ] = useGroupHelper({
    initial: account.settings?.recording_groups,
  });
  const recordingGroupNames = useMemo(
    () => recordingGroups.map((g) => g.name).sort(),
    [recordingGroups],
  );
  const [recordingMaxSessions, setRecordingMaxSessions] = useState(
    account?.settings?.recording_max_sessions ?? 0,
  );
  const [recordingMaxTotalSizeMb, setRecordingMaxTotalSizeMb] = useState(
    account?.settings?.recording_max_total_size_mb ?? 0,
  );
  const [recordingInputEnabled, setRecordingInputEnabled] = useState(
    account?.settings?.recording_input_enabled ?? true,
  );
  const [recordingEncryptionKey, setRecordingEncryptionKey] = useState(
    account?.settings?.recording_encryption_key ?? "",
  );

  const { hasChanges, updateRef } = useHasChanges([
    autoUpdateMethod,
    autoUpdateCustomVersion,
    autoUpdateAlways,
    peerExposeEnabled,
    peerExposeGroupNames,
    recordingEnabled,
    recordingGroupNames,
    recordingMaxSessions,
    recordingMaxTotalSizeMb,
    recordingInputEnabled,
    recordingEncryptionKey,
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
    const recGroups = await saveRecordingGroups();
    const peerExposeGroupIds = groups
      .map((group) => group.id)
      .filter(Boolean) as string[];
    const recordingGroupIds = recGroups
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
            auto_update_always: autoUpdateAlways,
            peer_expose_enabled: peerExposeEnabled,
            peer_expose_groups: peerExposeGroupIds,
            recording_enabled: recordingEnabled,
            recording_groups: recordingGroupIds,
            recording_max_sessions: recordingMaxSessions,
            recording_max_total_size_mb: recordingMaxTotalSizeMb,
            recording_input_enabled: recordingInputEnabled,
            recording_encryption_key: recordingEncryptionKey,
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([
            autoUpdateMethod,
            autoUpdateCustomVersion,
            autoUpdateAlways,
            peerExposeEnabled,
            peerExposeGroupNames,
            recordingEnabled,
            recordingGroupNames,
            recordingMaxSessions,
            recordingMaxTotalSizeMb,
            recordingInputEnabled,
            recordingEncryptionKey,
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
              Configure how NetBird clients receive update notifications.
              When enabled, users will be prompted to install the selected
              version. This requires at least NetBird{" "}
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
            <FancyToggleSwitch
              className={"mt-4"}
              value={autoUpdateAlways}
              onChange={setAutoUpdateAlways}
              label={
                <>
                  <AlertTriangle size={15} className={"text-yellow-400"} />
                  Force Automatic Updates
                </>
              }
              helpText={
                "When enabled, updates are installed automatically in the background without user interaction."
              }
              disabled={
                !permission.settings.update || autoUpdateMethod === "disabled"
              }
            />
            {autoUpdateAlways && autoUpdateMethod !== "disabled" && (
              <Callout
                className={"mt-3"}
                variant={"warning"}
                icon={
                  <AlertTriangle
                    size={14}
                    className={"shrink-0 relative top-[3px]"}
                  />
                }
              >
                Enabling automatic updates will restart the NetBird client
                during updates, which can temporarily disrupt active
                connections. Use with caution in production environments.
              </Callout>
            )}
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
            <Label>Session Recording</Label>
            <HelpText>
              When enabled, SSH and VNC sessions on peers in the selected groups
              will be recorded. Users see a warning that the session is being
              recorded. If recording cannot start, the session is denied.
            </HelpText>

            <FancyToggleSwitch
              className={"mt-2"}
              value={recordingEnabled}
              onChange={setRecordingEnabled}
              label={"Enable Session Recording"}
              helpText={
                "Record SSH terminal sessions and VNC screen sessions for peers in the selected groups."
              }
              disabled={!permission.settings.update}
            />

            <div
              className={cn(
                "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
                !recordingEnabled
                  ? "opacity-50 pointer-events-none"
                  : "bg-nb-gray-930/80",
              )}
            >
              <div className={"mt-2"}>
                <Label>Peer groups</Label>
                <HelpText>
                  Select which peer groups have session recording enabled. At
                  least one group is required.
                </HelpText>
                <PeerGroupSelector
                  values={recordingGroups}
                  onChange={setRecordingGroups}
                  placeholder="Select peer groups..."
                />
              </div>

              <FancyToggleSwitch
                value={recordingInputEnabled}
                onChange={setRecordingInputEnabled}
                label={"Record Input"}
                helpText={
                  "Capture keyboard input in SSH recordings. When disabled, only terminal output is recorded."
                }
                disabled={!permission.settings.update}
              />

              <div className={"flex gap-4"}>
                <div className={"flex-1"}>
                  <Label>Max recordings per peer</Label>
                  <HelpText>
                    Maximum number of recording files to keep. 0 means
                    unlimited.
                  </HelpText>
                  <Input
                    type="number"
                    min={0}
                    value={recordingMaxSessions}
                    onChange={(e) =>
                      setRecordingMaxSessions(Number(e.target.value))
                    }
                    placeholder="0"
                  />
                </div>
                <div className={"flex-1"}>
                  <Label>Max total size (MB)</Label>
                  <HelpText>
                    Maximum total size in MB of recordings per peer. 0 means
                    unlimited.
                  </HelpText>
                  <Input
                    type="number"
                    min={0}
                    value={recordingMaxTotalSizeMb}
                    onChange={(e) =>
                      setRecordingMaxTotalSizeMb(Number(e.target.value))
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>Encryption Key (optional)</Label>
                <HelpText>
                  Base64-encoded public key for encrypting recordings. When set,
                  recordings are encrypted at rest and can only be decrypted with
                  the corresponding private key.
                </HelpText>
                <Input
                  value={recordingEncryptionKey}
                  onChange={(e) => setRecordingEncryptionKey(e.target.value)}
                  placeholder="Base64-encoded public key..."
                  className="font-mono text-xs"
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
