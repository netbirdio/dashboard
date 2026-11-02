import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import { useApiCall } from "@utils/api";
import { Settings } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/crowdstrike.png";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { CrowdstrikeIntegration } from "@/interfaces/EDR";
import CrowdStrikeConfiguration from "@/modules/integrations/edr/crowdstrike/CrowdStrikeConfiguration";
import CrowdStrikeSetup from "@/modules/integrations/edr/crowdstrike/CrowdStrikeSetup";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";
import { useIntegrations } from "../useIntegrations";

type Props = {
  account: Account;
};

export const CrowdStrike = ({ account }: Props) => {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);

  const {
    crowdstrike: integration,
    isAnyIntegrationEnabled,
    isCrowdstrikeLoading: isLoading,
  } = useIntegrations();

  const integrationRequest = useApiCall<CrowdstrikeIntegration>(
    "/integrations/edr/falcon",
  );

  const [enabled, setEnabled] = useState(!!integration?.enabled);

  useEffect(() => {
    setEnabled(!!integration?.enabled);
  }, [integration]);

  const { confirm } = useDialog();

  const toggleSwitch = async () => {
    if (!integration?.cloud_id) return setSetupModal(true);
    const isCurrentlyEnabled = integration.enabled;

    const choice = isCurrentlyEnabled
      ? await confirm({
          title: `Disable CrowdStrike?`,
          description:
            "Are you sure you want to disable the CrowdStrike integration?",
          confirmText: "Disable",
          cancelText: "Cancel",
          type: "warning",
        })
      : true;
    if (!choice) return;

    const groups =
      integration.groups?.map((group) =>
        typeof group === "string" ? group : group.id,
      ) || [];

    notify({
      title: "CrowdStrike Integration",
      description: `CrowdStrike was successfully ${
        isCurrentlyEnabled ? "disabled" : "enabled"
      }`,
      promise: integrationRequest
        .put({
          ...integration,
          groups,
          secret: undefined,
          client_id: undefined,
          enabled: !isCurrentlyEnabled,
        })
        .then(() => {
          mutate("/integrations/edr/falcon");
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={197} />
  ) : (
    <>
      <IntegrationCard
        name="CrowdStrike"
        description="CrowdStrike is a cloud-native platform for protecting endpoints, cloud workloads, identities and data."
        url={{
          title: "crowdstrike.com",
          href: "https://www.crowdstrike.com/",
        }}
        image={integrationImage}
        data={integration?.cloud_id ? integration : undefined}
        switchState={enabled}
        onEnabledChange={toggleSwitch}
        onSetup={() => setSetupModal(true)}
        disabled={
          enabled
            ? !permission.edr.update
            : isAnyIntegrationEnabled || !permission.edr.create
        }
      >
        {integration && <ConfigurationButton config={integration} />}
      </IntegrationCard>

      <CrowdStrikeSetup
        account={account}
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => {
          setSetupModal(false);
        }}
      />
    </>
  );
};

type ConfigurationProps = {
  config: CrowdstrikeIntegration;
};
const ConfigurationButton = ({ config }: ConfigurationProps) => {
  const [configModal, setConfigModal] = useState(false);

  return (
    <>
      <div className={"flex gap-2"}>
        <Button
          variant={"secondary"}
          size={"xs"}
          className={"w-full items-center"}
          onClick={() => {
            setConfigModal(true);
          }}
        >
          <Settings size={14} />
          Settings
        </Button>
      </div>
      <CrowdStrikeConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
        config={config}
      />
    </>
  );
};
