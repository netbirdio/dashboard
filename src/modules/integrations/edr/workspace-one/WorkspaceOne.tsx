import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { isEmpty } from "lodash";
import { HistoryIcon, Settings } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/workspace-one.svg";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { WorkspaceOneIntegration } from "@/interfaces/EDR";
import { Group } from "@/interfaces/Group";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import WorkspaceOneConfiguration from "@/modules/integrations/edr/workspace-one/WorkspaceOneConfiguration";
import WorkspaceOneSetup from "@/modules/integrations/edr/workspace-one/WorkspaceOneSetup";

type Props = {
  account: Account;
};

export const WorkspaceOne = ({ account }: Props) => {
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);
  const { permission } = usePermissions();
  const { confirm } = useDialog();

  const {
    workspaceOne: integration,
    isAnyIntegrationEnabled,
    isWorkspaceOneLoading: isLoading,
  } = useIntegrations();
  const integrationRequest = useApiCall<WorkspaceOneIntegration>(
    "/integrations/edr/workspaceone",
  );

  const [enabled, setEnabled] = useState(!!integration?.enabled);

  useEffect(() => {
    setEnabled(!!integration?.enabled);
  }, [integration]);

  const toggleSwitch = async () => {
    if (!integration?.api_url) return setSetupModal(true);
    const isCurrentlyEnabled = integration.enabled;

    const choice = isCurrentlyEnabled
      ? await confirm({
          title: `Disable Workspace ONE?`,
          description: `Are you sure you want to disable the Workspace ONE integration?`,
          confirmText: "Disable",
          cancelText: "Cancel",
          type: "warning",
        })
      : true;
    if (!choice) return;

    const groups =
      integration.groups?.map((group) => (group as Group).id) || [];

    notify({
      title: "Workspace ONE Integration",
      description: `Workspace ONE was successfully ${
        isCurrentlyEnabled ? "disabled" : "enabled"
      }`,
      promise: integrationRequest
        .put({
          ...integration,
          groups,
          client_secret: undefined,
          api_key: undefined,
          enabled: !isCurrentlyEnabled,
        })
        .then(() => {
          mutate("/integrations/edr/workspaceone");
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={196} />
  ) : (
    <>
      <IntegrationCard
        name={"Workspace ONE"}
        description="Unified endpoint management platform for enforcing access based on Workspace ONE device compliance."
        url={{
          title: "omnissa.com",
          href: "https://www.omnissa.com/products/workspace-one-unified-endpoint-management/",
        }}
        image={integrationImage}
        data={integration?.api_url ? integration : undefined}
        disabled={
          enabled
            ? !permission.edr.update
            : isAnyIntegrationEnabled || !permission.edr.create
        }
        switchState={enabled}
        onEnabledChange={toggleSwitch}
        onSetup={() => setSetupModal(true)}
      >
        {integration && <ConfigurationButton config={integration} />}
      </IntegrationCard>
      <WorkspaceOneSetup
        account={account}
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => setEnabled(true)}
      />
    </>
  );
};

type ConfigurationProps = {
  config: WorkspaceOneIntegration;
};

const ConfigurationButton = ({ config }: ConfigurationProps) => {
  const [configModal, setConfigModal] = useState(false);

  const lastSync = useMemo(() => {
    if (isEmpty(config?.last_synced_at)) return "Not synchronized";
    return "Synced " + dayjs().to(config?.last_synced_at);
  }, [config]);

  return (
    <>
      <div className={"flex gap-2 justify-between"}>
        <div
          className={
            "text-xs flex gap-2 items-center text-nb-gray-300 font-medium"
          }
        >
          <HistoryIcon size={14} />
          {lastSync}
        </div>

        <Button
          variant={"secondary"}
          size={"xs"}
          className={"items-center"}
          onClick={() => {
            setConfigModal(true);
          }}
        >
          <Settings size={14} />
          Settings
        </Button>
      </div>
      <WorkspaceOneConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
        config={config}
      />
    </>
  );
};
