import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { isEmpty } from "lodash";
import { RefreshCw, Repeat, Settings } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/jumpcloud.png";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  IdentityProviderLog,
  ScimIntegration,
} from "@/interfaces/IdentityProvider";
import JumpcloudConfiguration from "@/modules/integrations/idp-sync/jumpcloud/JumpcloudConfiguration";
import JumpcloudSetup from "@/modules/integrations/idp-sync/jumpcloud/JumpcloudSetup";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

export const Jumpcloud = () => {
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);
  const { permission } = usePermissions();

  const {
    jumpcloud: integration,
    isAnyIntegrationEnabled,
    isScimLoading: isLoading,
  } = useIntegrations();
  const scimRequest = useApiCall<ScimIntegration>("/integrations/scim-idp");

  const [enabled, setEnabled] = useState(
    integration ? integration.enabled : false,
  );

  useEffect(() => {
    setEnabled(integration?.enabled ?? false);
  }, [integration]);

  const toggleSwitch = async (state: boolean) => {
    if (!integration) return setSetupModal(true);

    notify({
      title: "Jumpcloud Integration",
      description: `Jumpcloud was successfully ${
        state ? "enabled" : "disabled"
      }`,
      promise: scimRequest
        .put(
          {
            enabled: state,
          },
          "/" + integration.id,
        )
        .then(() => {
          mutate("/integrations/scim-idp");
          setEnabled(state);
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={196} />
  ) : (
    <>
      <IntegrationCard
        name="Jumpcloud"
        description="Jumpcloud is a unified identity, device, and access management platform."
        url={{
          title: "jumpcloud.com",
          href: "https://jumpcloud.com/",
        }}
        image={integrationImage}
        data={integration}
        disabled={
          enabled
            ? !permission.idp.update
            : isAnyIntegrationEnabled || !permission.idp.create
        }
        switchState={enabled}
        onEnabledChange={toggleSwitch}
        onSetup={() => setSetupModal(true)}
        customButton={
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"w-full items-center"}
            onClick={() => setSetupModal(true)}
          >
            <Repeat size={13} />
            Connect Jumpcloud
          </Button>
        }
      >
        {integration && <ConfigurationButton config={integration} />}
      </IntegrationCard>

      <JumpcloudSetup
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => {
          setEnabled(true);
          mutate("/integrations/scim-idp");
        }}
      />
    </>
  );
};

type ConfigurationProps = {
  config: ScimIntegration;
};
const ConfigurationButton = ({ config }: ConfigurationProps) => {
  const { data: logs } = useFetchApi<IdentityProviderLog[]>(
    `/integrations/scim-idp/${config.id}/logs`,
  );

  const [configModal, setConfigModal] = useState(false);

  const lastSync = useMemo(() => {
    if (isEmpty(logs)) return "Not synchronized";
    return "Synced " + dayjs().to(logs?.[0]?.timestamp);
  }, [logs]);

  return (
    <>
      <div className={"flex gap-2"}>
        <Button
          variant={"default-outline"}
          size={"xs"}
          className={"w-full items-center pointer-events-none"}
          disabled={!config.enabled}
        >
          <RefreshCw size={14} />
          {lastSync}
        </Button>

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
      <JumpcloudConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
      />
    </>
  );
};
