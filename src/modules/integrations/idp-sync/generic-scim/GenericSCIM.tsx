import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { isEmpty } from "lodash";
import { RefreshCw, Repeat, Settings } from "lucide-react";
import { StaticImageData } from "next/image";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/generic-scim.png";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  IdentityProvider,
  IdentityProviderLog,
  ScimIntegration,
} from "@/interfaces/IdentityProvider";
import GenericSCIMConfiguration from "@/modules/integrations/idp-sync/generic-scim/GenericSCIMConfiguration";
import GenericSCIMSetup from "@/modules/integrations/idp-sync/generic-scim/GenericSCIMSetup";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";
import EntraSCIMSetup from "@/modules/integrations/idp-sync/entra-scim/EntraSCIMSetup";

export interface GenericSCIMProps {
  name?: string;
  description?: string;
  url?: {
    title: string;
    href: string;
  };
  image?: string | StaticImageData;
  provider?: IdentityProvider;
}

export const GenericSCIM = ({
  name,
  description,
  url = {
    title: "docs.netbird.io",
    href: "https://docs.netbird.io/how-to/idp-sync#supported-identity-providers",
  },
  image = integrationImage,
  provider = IdentityProvider.GENERIC,
}: GenericSCIMProps) => {
  const t = useTranslations();
  const resolvedName = name ?? t("integrations.idpGenericName");
  const resolvedDescription =
    description ?? t("integrations.idpGenericDescription");
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);
  const { permission } = usePermissions();

  const {
    isAnyIntegrationEnabled,
    isScimLoading: isLoading,
    getScimIntegrationByProvider,
  } = useIntegrations();

  const integration = getScimIntegrationByProvider(provider);
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
      title: t("integrations.idpIntegrationTitle", { name: resolvedName }),
      description: t("integrations.idpStateDescription", {
        name: resolvedName,
        state: state ? t("common.enabled") : t("common.disabled"),
      }),
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
      loadingMessage: t("integrations.idpUpdatingLoading"),
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={196} />
  ) : (
    <>
      <IntegrationCard
        name={resolvedName}
        description={resolvedDescription}
        url={url}
        image={image}
        data={integration}
        disabled={
          enabled
            ? !permission?.idp?.update
            : isAnyIntegrationEnabled || !permission?.idp?.create
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
            {t("integrations.idpConnectButton", { name: resolvedName })}
          </Button>
        }
      >
        {integration && (
          <ConfigurationButton
            config={integration}
            name={resolvedName}
            image={image}
            provider={provider}
          />
        )}
      </IntegrationCard>

      {provider === IdentityProvider.GENERIC ? (
        <GenericSCIMSetup
          open={setupModal}
          onOpenChange={setSetupModal}
          onSuccess={() => {
            setEnabled(true);
            mutate("/integrations/scim-idp");
          }}
          name={resolvedName}
          image={image}
          provider={provider}
        />
      ) : (
        <EntraSCIMSetup
          open={setupModal}
          onOpenChange={setSetupModal}
          onSuccess={() => {
            setEnabled(true);
            mutate("/integrations/scim-idp");
          }}
          name={resolvedName}
          image={image}
        />
      )}
    </>
  );
};

interface ConfigurationProps extends GenericSCIMProps {
  config: ScimIntegration;
}

const ConfigurationButton = ({
  config,
  name,
  image,
  provider,
}: ConfigurationProps) => {
  const t = useTranslations();
  const { data: logs } = useFetchApi<IdentityProviderLog[]>(
    `/integrations/scim-idp/${config.id}/logs`,
  );

  const [configModal, setConfigModal] = useState(false);

  const lastSync = useMemo(() => {
    if (isEmpty(logs)) return t("integrations.idpNotSynchronized");
    return t("integrations.idpSyncedAgo", {
      time: dayjs().to(logs?.[0]?.timestamp),
    });
  }, [logs, t]);

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
      <GenericSCIMConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
        name={name}
        image={image}
        provider={provider}
      />
    </>
  );
};
