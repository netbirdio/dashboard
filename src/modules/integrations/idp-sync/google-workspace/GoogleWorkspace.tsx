import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { isEmpty } from "lodash";
import { RefreshCw, Settings } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/google-workspace.png";
import {
  AzureADIntegration,
  GoogleWorkspaceIntegration,
  IdentityProviderLog,
} from "@/interfaces/IdentityProvider";
import GoogleWorkspaceConfiguration from "@/modules/integrations/idp-sync/google-workspace/GoogleWorkspaceConfiguration";
import GoogleWorkspaceSetup from "@/modules/integrations/idp-sync/google-workspace/GoogleWorkspaceSetup";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

export const GoogleWorkspace = () => {
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);

  const {
    google: integration,
    isAnyIntegrationEnabled,
    isGoogleLoading,
  } = useIntegrations();
  const googleRequest = useApiCall<AzureADIntegration>(
    "/integrations/google-idp",
  );

  const [enabled, setEnabled] = useState(
    integration ? integration.enabled : false,
  );

  useEffect(() => {
    setEnabled(integration?.enabled ?? false);
  }, [integration]);

  const toggleSwitch = async (state: boolean) => {
    if (!integration) return setSetupModal(true);

    notify({
      title: "Google Workspace Integration",
      description: `Google Workspace was successfully ${
        state ? "enabled" : "disabled"
      }`,
      promise: googleRequest
        .put(
          {
            enabled: state,
          },
          "/" + integration.id,
        )
        .then(() => {
          mutate("/integrations/google-idp");
          setEnabled(state);
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isGoogleLoading ? (
    <SkeletonIntegration loadingHeight={197} />
  ) : (
    <>
      <IntegrationCard
        name="Google Workspace"
        description="A flexible, innovative solution for people and organizations to achieve more."
        url={{
          title: "workspace.google.com",
          href: "https://workspace.google.com/",
        }}
        image={integrationImage}
        data={integration}
        disabled={enabled ? false : isAnyIntegrationEnabled}
        switchState={enabled}
        onEnabledChange={toggleSwitch}
        onSetup={() => setSetupModal(true)}
      >
        {integration && <ConfigurationButton config={integration} />}
      </IntegrationCard>
      <GoogleWorkspaceSetup
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => setEnabled(true)}
      />
    </>
  );
};

type ConfigurationProps = {
  config: GoogleWorkspaceIntegration;
};
const ConfigurationButton = ({ config }: ConfigurationProps) => {
  const { data: logs } = useFetchApi<IdentityProviderLog[]>(
    `/integrations/google-idp/${config.id}/logs`,
  );
  const { mutate } = useSWRConfig();
  const syncRequest = useApiCall<{ response: boolean }>(
    `/integrations/google-idp/${config.id}/sync`,
  );

  const [configModal, setConfigModal] = useState(false);

  const forceSync = async () => {
    notify({
      title: "Google Workspace Integration",
      description: `Google Workspace was successfully synced`,
      loadingMessage: "Syncing integration...",
      promise: syncRequest.post({}).then(() => {
        mutate(`/integrations/google-idp/${config.id}/logs`);
      }),
    });
  };

  const lastSync = useMemo(() => {
    if (isEmpty(logs)) return "Not synchronized";
    return "Synced " + dayjs().to(logs?.[0]?.timestamp);
  }, [logs]);

  return (
    <>
      <div className={"flex gap-2"}>
        <FullTooltip
          content={
            <div className={"text-xs"}>
              Force synchronization of users and groups
            </div>
          }
          disabled={!config.enabled}
          className={"w-full"}
          interactive={false}
        >
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"w-full items-center"}
            onClick={forceSync}
            disabled={!config.enabled}
          >
            <RefreshCw size={14} />
            {lastSync}
          </Button>
        </FullTooltip>

        <Button
          variant={"secondary"}
          size={"xs"}
          className={"items-center"}
          onClick={() => {
            setConfigModal(true);
          }}
        >
          <Settings size={14} />
        </Button>
      </div>
      <GoogleWorkspaceConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
      />
    </>
  );
};
