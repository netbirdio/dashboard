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
import { useI18n } from "@/i18n/I18nProvider";
import { Account } from "@/interfaces/Account";
import { SmallBadge } from "@components/ui/SmallBadge";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useGroups } from "@/contexts/GroupsProvider";
import { SkeletonSettings } from "@components/skeletons/SkeletonSettings";

type Props = {
  account: Account;
};

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
  const { t } = useI18n();

  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);
  const latestOrCustomVersion: SelectOption[] = [
    {
      label: t("clientSettings.autoUpdateDisabled"),
      value: "disabled",
    },
    {
      label: t("clientSettings.autoUpdateLatest"),
      value: "latest",
    },
    {
      label: t("clientSettings.autoUpdateCustom"),
      value: "custom",
    },
  ];

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

  const { hasChanges, updateRef } = useHasChanges([
    autoUpdateMethod,
    autoUpdateCustomVersion,
    autoUpdateAlways,
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
    const msg = t("clientSettings.versionError");
    if (autoUpdateCustomVersion == "") return "";
    if (autoUpdateCustomVersion == "-") return "";
    const validSemver = validator.isValidVersion(autoUpdateCustomVersion);
    if (!validSemver) return msg;
    return "";
  }, [autoUpdateCustomVersion, t]);

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
      title: t("clientSettings.notifyTitle"),
      description: t("clientSettings.updatedDescription"),
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            auto_update_version: autoUpdateCustomVersion || autoUpdateMethod,
            auto_update_always: autoUpdateAlways,
            peer_expose_enabled: peerExposeEnabled,
            peer_expose_groups: peerExposeGroupIds,
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
          ]);
        }),
      loadingMessage: t("clientSettings.updating"),
    });
  };

  const toggleLazyConnection = async (toggle: boolean) => {
    notify({
      title: t("clientSettings.lazyConnectionsTitle"),
      description: toggle
        ? t("clientSettings.lazyConnectionsEnabled")
        : t("clientSettings.lazyConnectionsDisabled"),
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
      loadingMessage: t("clientSettings.lazyConnectionsUpdating"),
    });
  };

  return (
    <Tabs.Content value={"clients"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=clients"}
            label={t("settings.clients")}
            icon={<MonitorSmartphoneIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>{t("settings.clients")}</h1>
          <Button
            variant={"primary"}
            disabled={isSaveButtonDisabled}
            onClick={saveChanges}
            data-cy={"save-clients-settings"}
          >
            {t("actions.saveChanges")}
          </Button>
        </div>

        <div className={"flex flex-col gap-10 w-full mt-8"}>
          <div className={"flex flex-col relative"}>
            <Label>
              <RefreshCcw size={15} />
              {t("clientSettings.automaticUpdates")}
              <SmallBadge
                text={t("common.beta")}
                variant={"sky"}
                className={"text-[9px] leading-none py-[3px] px-[5px]"}
                textClassName={"top-0"}
              />
            </Label>
            <HelpText>
              {t("clientSettings.automaticUpdatesHelpPrefix")}
              {` `}
              {t("clientSettings.automaticUpdatesHelpMiddle")}
              {` `}
              {t("clientSettings.requiresAtLeast")}
              {` `}
              <span className={"text-white font-medium"}>v0.61.0</span>.{" "}
              <InlineLink
                href={"https://docs.netbird.io/manage/peers/auto-update"}
                target={"_blank"}
              >
                {t("clientSettings.learnMore")}
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
                customPrefix={t("clientSettings.version")}
                placeholder={t("clientSettings.versionPlaceholder")}
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
                  {t("clientSettings.forceAutomaticUpdates")}
                </>
              }
              helpText={
                t("clientSettings.forceAutomaticUpdatesHelp")
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
                {t("clientSettings.forceAutomaticUpdatesWarning")}
              </Callout>
            )}
          </div>

          <div>
            <div>
              <Label>
                <ReverseProxyIcon size={15} className={"fill-nb-gray-300"} />
                {t("clientSettings.exposeServices")}
              </Label>
              <HelpText>
                {t("clientSettings.exposeServicesHelpLine1")} <br />{" "}
                {t("clientSettings.requiresAtLeast")}
                {` `}
                <span className={"text-white font-medium"}>v0.66.0</span>.{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/manage/reverse-proxy/expose-from-cli"
                  }
                  target={"_blank"}
                >
                  {t("clientSettings.learnMore")}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </HelpText>
            </div>

            <FancyToggleSwitch
              className={"mt-2"}
              value={peerExposeEnabled}
              onChange={setPeerExposeEnabled}
              label={t("clientSettings.enablePeerExpose")}
              helpText={
                t("clientSettings.enablePeerExposeHelp")
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
                <Label>{t("clientSettings.allowedPeerGroups")}</Label>
                <HelpText>
                  {t("clientSettings.allowedPeerGroupsHelp")}
                </HelpText>
                <PeerGroupSelector
                  values={peerExposeGroups}
                  onChange={setPeerExposeGroups}
                  placeholder={t("clientSettings.selectPeerGroups")}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>
              <FlaskConicalIcon size={15} />
              {t("clientSettings.experimental")}
            </Label>

            <HelpText>
              {t("clientSettings.lazyConnectionsHelpPrefix")}{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/lazy-connection"}
                target={"_blank"}
              >
                {t("clientSettings.learnMore")}
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
                  {t("clientSettings.enableLazyConnections")}
                </>
              }
              helpText={
                <>
                  {t("clientSettings.enableLazyConnectionsHelp")}
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
