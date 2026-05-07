import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { Callout } from "@components/Callout";
import { notify } from "@components/Notification";
import { useHasChanges } from "@hooks/useHasChanges";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { ActivityIcon, InfoIcon, SettingsIcon as LucideSettingsIcon, HardDrive, Network } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

function readFlowEnabled(account: Account) {
  return (
    account.settings?.flow?.enabled ??
    account.settings?.flow_logs?.enabled ??
    account.settings?.extra?.network_traffic_logs_enabled ??
    account.settings?.extra?.flow_enabled ??
    false
  );
}

function readFlowCounters(account: Account) {
  return (
    account.settings?.flow?.counters ??
    account.settings?.flow_logs?.counters ??
    account.settings?.extra?.network_traffic_packet_counter_enabled ??
    account.settings?.extra?.flow_packet_counter_enabled ??
    false
  );
}

function readFlowDNS(account: Account) {
  return (
    account.settings?.flow?.dns_collection ??
    account.settings?.flow_logs?.dns_collection ??
    account.settings?.extra?.network_traffic_dns_collection_enabled ??
    account.settings?.extra?.flow_dns_collection_enabled ??
    false
  );
}

function readFlowExitNode(account: Account) {
  return (
    account.settings?.flow?.exit_node_collection ??
    account.settings?.flow_logs?.exit_node_collection ??
    account.settings?.extra?.network_traffic_exit_node_collection_enabled ??
    account.settings?.extra?.flow_exit_node_collection_enabled ??
    false
  );
}

function readFlowGroups(account: Account) {
  return (
    account.settings?.flow?.groups ??
    account.settings?.flow_logs?.groups ??
    account.settings?.extra?.network_traffic_logs_groups ??
    account.settings?.extra?.flow_groups ??
    []
  );
}

export default function FlowLogsSettingsTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [flowEnabled, setFlowEnabled] = useState(() => readFlowEnabled(account));
  const [flowCountersEnabled, setFlowCountersEnabled] = useState(() =>
    readFlowCounters(account),
  );
  const [flowDNSCollectionEnabled, setFlowDNSCollectionEnabled] = useState(() =>
    readFlowDNS(account),
  );
  const [flowExitNodeCollectionEnabled, setFlowExitNodeCollectionEnabled] =
    useState(() => readFlowExitNode(account));

  const [flowLocalStorageEnabled, setFlowLocalStorageEnabled] = useState(() =>
    account.settings?.extra?.flow_local_storage_enabled ?? false
  );
  const [flowLocalStoragePath, setFlowLocalStoragePath] = useState(() =>
    account.settings?.extra?.flow_local_storage_path ?? ""
  );
  const [flowLocalStorageMaxSizeMb, setFlowLocalStorageMaxSizeMb] = useState(() =>
    account.settings?.extra?.flow_local_storage_max_size_mb ?? 100
  );
  const [flowLocalStorageMaxFiles, setFlowLocalStorageMaxFiles] = useState(() =>
    account.settings?.extra?.flow_local_storage_max_files ?? 10
  );

  const [flowSyslogEnabled, setFlowSyslogEnabled] = useState(() =>
    account.settings?.extra?.flow_syslog_enabled ?? false
  );
  const [flowSyslogServer, setFlowSyslogServer] = useState(() =>
    account.settings?.extra?.flow_syslog_server ?? ""
  );
  const [flowSyslogProtocol, setFlowSyslogProtocol] = useState(() =>
    account.settings?.extra?.flow_syslog_protocol ?? "udp"
  );
  const [flowSyslogFacility, setFlowSyslogFacility] = useState(() =>
    account.settings?.extra?.flow_syslog_facility ?? "daemon"
  );
  const [flowSyslogTag, setFlowSyslogTag] = useState(() =>
    account.settings?.extra?.flow_syslog_tag ?? "netbird"
  );

  const flowGroups = useMemo(() => readFlowGroups(account), [account]);

  const { hasChanges, updateRef } = useHasChanges([
    flowEnabled,
    flowCountersEnabled,
    flowDNSCollectionEnabled,
    flowExitNodeCollectionEnabled,
    flowLocalStorageEnabled,
    flowLocalStoragePath,
    flowLocalStorageMaxSizeMb,
    flowLocalStorageMaxFiles,
    flowSyslogEnabled,
    flowSyslogServer,
    flowSyslogProtocol,
    flowSyslogFacility,
    flowSyslogTag,
  ]);

  const saveChanges = async () => {
    notify({
      title: t("flowLogsSettings.notifyTitle"),
      description: t("flowLogsSettings.updatedDescription"),
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            extra: {
              ...account.settings?.extra,
              network_traffic_logs_enabled: flowEnabled,
              network_traffic_logs_groups: flowGroups,
              network_traffic_packet_counter_enabled: flowCountersEnabled,
              network_traffic_dns_collection_enabled:
                flowDNSCollectionEnabled,
              network_traffic_exit_node_collection_enabled:
                flowExitNodeCollectionEnabled,
              flow_enabled: flowEnabled,
              flow_groups: flowGroups,
              flow_packet_counter_enabled: flowCountersEnabled,
              flow_dns_collection_enabled: flowDNSCollectionEnabled,
              flow_exit_node_collection_enabled:
                flowExitNodeCollectionEnabled,
              flow_local_storage_enabled: flowLocalStorageEnabled,
              flow_local_storage_path: flowLocalStoragePath,
              flow_local_storage_max_size_mb: flowLocalStorageMaxSizeMb,
              flow_local_storage_max_files: flowLocalStorageMaxFiles,
              flow_syslog_enabled: flowSyslogEnabled,
              flow_syslog_server: flowSyslogServer,
              flow_syslog_protocol: flowSyslogProtocol,
              flow_syslog_facility: flowSyslogFacility,
              flow_syslog_tag: flowSyslogTag,
            },
            flow: {
              enabled: flowEnabled,
              groups: flowGroups,
              counters: flowCountersEnabled,
              dns_collection: flowDNSCollectionEnabled,
              exit_node_collection: flowExitNodeCollectionEnabled,
            },
            flow_logs: {
              enabled: flowEnabled,
              groups: flowGroups,
              counters: flowCountersEnabled,
              dns_collection: flowDNSCollectionEnabled,
              exit_node_collection: flowExitNodeCollectionEnabled,
            },
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([
            flowEnabled,
            flowCountersEnabled,
            flowDNSCollectionEnabled,
            flowExitNodeCollectionEnabled,
            flowLocalStorageEnabled,
            flowLocalStoragePath,
            flowLocalStorageMaxSizeMb,
            flowLocalStorageMaxFiles,
            flowSyslogEnabled,
            flowSyslogServer,
            flowSyslogProtocol,
            flowSyslogFacility,
            flowSyslogTag,
          ]);
        }),
      loadingMessage: t("flowLogsSettings.updating"),
    });
  };

  return (
    <Tabs.Content value={"flow-logs"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=flow-logs"}
            label={t("settings.flowLogs")}
            icon={<ActivityIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>{t("settings.flowLogs")}</h1>
            <p className={"text-sm text-nb-gray-400 mt-2"}>
              {t("flowLogsSettings.description")}
            </p>
          </div>

          <Button
            variant={"primary"}
            disabled={!hasChanges || !permission.settings.update}
            onClick={saveChanges}
            data-cy={"save-flow-logs-settings"}
          >
            {t("actions.saveChanges")}
          </Button>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8"}>
          <FancyToggleSwitch
            value={flowEnabled}
            onChange={setFlowEnabled}
            dataCy={"flow-logs-enabled"}
            label={
              <>
                <ActivityIcon size={15} />
                {t("flowLogsSettings.enable")}
              </>
            }
            helpText={t("flowLogsSettings.enableHelp")}
            disabled={!permission.settings.update}
          />

          <FancyToggleSwitch
            value={flowCountersEnabled}
            onChange={setFlowCountersEnabled}
            dataCy={"flow-logs-counters"}
            label={
              <>
                <LucideSettingsIcon size={15} />
                {t("flowLogsSettings.enableCounters")}
              </>
            }
            helpText={t("flowLogsSettings.enableCountersHelp")}
            disabled={!permission.settings.update || !flowEnabled}
          />

          <FancyToggleSwitch
            value={flowDNSCollectionEnabled}
            onChange={setFlowDNSCollectionEnabled}
            dataCy={"flow-logs-dns"}
            label={
              <>
                <LucideSettingsIcon size={15} />
                {t("flowLogsSettings.enableDnsCollection")}
              </>
            }
            helpText={t("flowLogsSettings.enableDnsCollectionHelp")}
            disabled={!permission.settings.update || !flowEnabled}
          />

          <FancyToggleSwitch
            value={flowExitNodeCollectionEnabled}
            onChange={setFlowExitNodeCollectionEnabled}
            dataCy={"flow-logs-exit-node"}
            label={
              <>
                <LucideSettingsIcon size={15} />
                {t("flowLogsSettings.enableExitNodeCollection")}
              </>
            }
            helpText={t("flowLogsSettings.enableExitNodeCollectionHelp")}
            disabled={!permission.settings.update || !flowEnabled}
          />

          <div className="border-t border-nb-gray-700 pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HardDrive size={18} />
              {t("flowLogsSettings.localStorage")}
            </h2>
            
            <FancyToggleSwitch
              value={flowLocalStorageEnabled}
              onChange={setFlowLocalStorageEnabled}
              dataCy={"flow-local-storage-enabled"}
              label={
                <>
                  <HardDrive size={15} />
                  {t("flowLogsSettings.enableLocalStorage")}
                </>
              }
              helpText={t("flowLogsSettings.enableLocalStorageHelp")}
              disabled={!permission.settings.update || !flowEnabled}
            />

            {flowLocalStorageEnabled && (
              <div className="mt-4 pl-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.storagePath")}</label>
                  <input
                    type="text"
                    value={flowLocalStoragePath}
                    onChange={(e) => setFlowLocalStoragePath(e.target.value)}
                    placeholder={t("flowLogsSettings.storagePathPlaceholder")}
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary"
                    disabled={!permission.settings.update}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.maxFileSize")}</label>
                  <input
                    type="number"
                    value={flowLocalStorageMaxSizeMb}
                    onChange={(e) => setFlowLocalStorageMaxSizeMb(Number(e.target.value))}
                    min="1"
                    max="1000"
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary w-32"
                    disabled={!permission.settings.update}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.maxFiles")}</label>
                  <input
                    type="number"
                    value={flowLocalStorageMaxFiles}
                    onChange={(e) => setFlowLocalStorageMaxFiles(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary w-32"
                    disabled={!permission.settings.update}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-nb-gray-700 pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Network size={18} />
              {t("flowLogsSettings.syslog")}
            </h2>
            
            <FancyToggleSwitch
              value={flowSyslogEnabled}
              onChange={setFlowSyslogEnabled}
              dataCy={"flow-syslog-enabled"}
              label={
                <>
                  <Network size={15} />
                  {t("flowLogsSettings.enableSyslog")}
                </>
              }
              helpText={t("flowLogsSettings.enableSyslogHelp")}
              disabled={!permission.settings.update || !flowEnabled}
            />

            {flowSyslogEnabled && (
              <div className="mt-4 pl-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.syslogServer")}</label>
                  <input
                    type="text"
                    value={flowSyslogServer}
                    onChange={(e) => setFlowSyslogServer(e.target.value)}
                    placeholder={t("flowLogsSettings.syslogServerPlaceholder")}
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary"
                    disabled={!permission.settings.update}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.syslogProtocol")}</label>
                  <select
                    value={flowSyslogProtocol}
                    onChange={(e) => setFlowSyslogProtocol(e.target.value)}
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary w-32"
                    disabled={!permission.settings.update}
                  >
                    <option value="udp">UDP</option>
                    <option value="tcp">TCP</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.syslogFacility")}</label>
                  <select
                    value={flowSyslogFacility}
                    onChange={(e) => setFlowSyslogFacility(e.target.value)}
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary w-40"
                    disabled={!permission.settings.update}
                  >
                    <option value="daemon">Daemon</option>
                    <option value="local0">Local0</option>
                    <option value="local1">Local1</option>
                    <option value="local2">Local2</option>
                    <option value="local3">Local3</option>
                    <option value="local4">Local4</option>
                    <option value="local5">Local5</option>
                    <option value="local6">Local6</option>
                    <option value="local7">Local7</option>
                    <option value="kern">Kernel</option>
                    <option value="user">User</option>
                    <option value="mail">Mail</option>
                    <option value="auth">Auth</option>
                    <option value="syslog">Syslog</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-nb-gray-300">{t("flowLogsSettings.syslogTag")}</label>
                  <input
                    type="text"
                    value={flowSyslogTag}
                    onChange={(e) => setFlowSyslogTag(e.target.value)}
                    placeholder={t("flowLogsSettings.syslogTagPlaceholder")}
                    className="bg-nb-gray-800 border border-nb-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-nb-primary w-40"
                    disabled={!permission.settings.update}
                  />
                </div>
              </div>
            )}
          </div>

          <Callout
            variant={"info"}
            icon={<InfoIcon size={14} className={"shrink-0 relative top-[3px]"} />}
          >
            {t("flowLogsSettings.windowsCallout")}
          </Callout>
        </div>
      </div>
    </Tabs.Content>
  );
}
