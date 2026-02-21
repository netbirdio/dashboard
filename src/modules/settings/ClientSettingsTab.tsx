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
import { validator } from "@utils/helpers";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClockFadingIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  GlobeIcon,
  MonitorSmartphoneIcon,
  RefreshCcw,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { Group } from "@/interfaces/Group";
import { useGroupIdsToGroups } from "@/modules/groups/useGroupIdsToGroups";
import { SmallBadge } from "@components/ui/SmallBadge";

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

  const initialGroups = useGroupIdsToGroups(
    account?.settings?.extra?.peer_expose_groups,
  );
  const [peerExposeGroups, setPeerExposeGroups] = useState<Group[]>(
    initialGroups ?? [],
  );

  const peerExposeGroupIds = useMemo(
    () => peerExposeGroups.map((g) => g.id).filter(Boolean) as string[],
    [peerExposeGroups],
  );

  const { hasChanges, updateRef } = useHasChanges([
    autoUpdateMethod,
    autoUpdateCustomVersion,
    peerExposeEnabled,
    peerExposeGroupIds,
  ]);

  React.useEffect(() => {
    if (initialGroups) {
      setPeerExposeGroups(initialGroups);
      const groupIds = initialGroups
        .map((g) => g.id)
        .filter(Boolean) as string[];
      updateRef([
        autoUpdateMethod,
        autoUpdateCustomVersion,
        peerExposeEnabled,
        groupIds,
      ]);
    }
  }, [initialGroups]);

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
      (peerExposeEnabled && peerExposeGroupIds.length === 0)
    );
  }, [
    hasChanges,
    permission.settings.update,
    autoUpdateMethod,
    canSaveCustomVersion,
    peerExposeEnabled,
    peerExposeGroupIds,
  ]);

  const saveChanges = async () => {
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
            peerExposeGroupIds,
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
      <div className={"p-default py-6 max-w-xl"}>
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

        <div className={"flex flex-col gap-6 w-full mt-8"}>
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

          <div className={"mt-3"}>
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
          </div>
          <FancyToggleSwitch
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
                Allow to establish connections between peers only when required.
                This requires NetBird client v0.45 or higher. Changes will only
                take effect after restarting the clients.
              </>
            }
            disabled={!permission.settings.update}
          />

          <div className={"mt-3"}>
            <Label>
              <GlobeIcon size={15} />
              Peer Expose
            </Label>
            <HelpText>
              Allow peers to expose local services through the NetBird reverse
              proxy using the CLI.{" "}
              <InlineLink
                href={"https://docs.netbird.io/manage/reverse-proxy/expose-from-cli"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </HelpText>
          </div>

          <FancyToggleSwitch
            value={peerExposeEnabled}
            onChange={setPeerExposeEnabled}
            label={
              <>
                <GlobeIcon size={15} />
                Enable Peer Expose
              </>
            }
            helpText={
              "When enabled, peers can expose local HTTP services accessible via a public URL."
            }
            disabled={!permission.settings.update}
          />

          <AnimatePresence>
            {peerExposeEnabled && (
              <div className={"overflow-hidden -top-4 relative z-0"}>
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.98 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.98 }}
                >
                  <div
                    className={
                      "flex flex-col gap-6 bg-nb-gray-940 px-6 pt-5 pb-6 border border-nb-gray-930 rounded-b-md relative mx-3"
                    }
                  >
                    <div>
                      <Label>Allowed peer groups</Label>
                      <HelpText>
                        Select which peer groups are allowed to expose
                        services. At least one group is required.
                      </HelpText>
                      <PeerGroupSelector
                        values={peerExposeGroups}
                        onChange={setPeerExposeGroups}
                        placeholder="Select peer groups..."
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Tabs.Content>
  );
}
