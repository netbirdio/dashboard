import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { RefreshCw, Settings } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/okta.png";
import {
  IdentityProviderLog,
  OktaIntegration,
} from "@/interfaces/IdentityProvider";
import OktaConfiguration from "@/modules/integrations/idp-sync/okta-scim/OktaConfiguration";
import OktaSetup from "@/modules/integrations/idp-sync/okta-scim/OktaSetup";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

export const Okta = () => {
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);

  const {
    okta: integration,
    isAnyIntegrationEnabled,
    isOktaLoading,
  } = useIntegrations();
  const oktaRequest = useApiCall<OktaIntegration>(
    "/integrations/okta-scim-idp",
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
      title: "Okta Integration",
      description: `Okta was successfully ${state ? "enabled" : "disabled"}`,
      promise: oktaRequest
        .put(
          {
            enabled: state,
          },
          "/" + integration.id,
        )
        .then(() => {
          mutate("/integrations/okta-scim-idp");
          setEnabled(state);
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isOktaLoading ? (
    <SkeletonIntegration loadingHeight={197} />
  ) : (
    <>
      <IntegrationCard
        name="Okta"
        description="Okta is a platform to provision and manage user accounts in cloud-based applications."
        url={{
          title: "okta.com",
          href: "https://www.okta.com/",
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
      <OktaSetup
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => {
          setEnabled(true);
          mutate("/integrations/okta-scim-idp");
        }}
      />
    </>
  );
};

type ConfigurationProps = {
  config: OktaIntegration;
};
const ConfigurationButton = ({ config }: ConfigurationProps) => {
  const { data: logs } = useFetchApi<IdentityProviderLog[]>(
    `/integrations/okta-scim-idp/${config.id}/logs`,
  );

  const [configModal, setConfigModal] = useState(false);

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
          Synced {dayjs().to(logs?.[0]?.timestamp)}
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
      <OktaConfiguration open={configModal} onOpenChange={setConfigModal} />
    </>
  );
};
