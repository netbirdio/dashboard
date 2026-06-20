import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import { useApiCall } from "@utils/api";
import { validator } from "@utils/helpers";
import dayjs from "dayjs";
import { isEmpty } from "lodash";
import { HistoryIcon, Settings } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/sentinelone.png";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import {
  SentinelOneIntegration,
  SentinelOneMatchAttributes,
} from "@/interfaces/EDR";
import SentinelOneConfiguration from "@/modules/integrations/edr/sentinel-one/SentinelOneConfiguration";
import SentinelOneSetup from "@/modules/integrations/edr/sentinel-one/SentinelOneSetup";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";
import { Group } from "@/interfaces/Group";

type Props = {
  account: Account;
};

export const SentinelOne = ({ account }: Props) => {
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);
  const { permission } = usePermissions();
  const { confirm } = useDialog();

  const {
    sentinelOne: integration,
    isAnyIntegrationEnabled,
    isSentinelOneLoading: isLoading,
  } = useIntegrations();
  const integrationRequest = useApiCall<SentinelOneIntegration>(
    "/integrations/edr/sentinelone",
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
          title: `Disable SentinelOne?`,
          description: `Are you sure you want to disable the SentinelOne integration?`,
          confirmText: "Disable",
          cancelText: "Cancel",
          type: "warning",
        })
      : true;
    if (!choice) return;

    const groups =
      integration.groups?.map((group) => (group as Group).id) || [];

    notify({
      title: "SentinelOne Integration",
      description: `SentinelOne was successfully ${
        isCurrentlyEnabled ? "disabled" : "enabled"
      }`,
      promise: integrationRequest
        .put({
          ...integration,
          groups,
          api_token: undefined,
          enabled: !isCurrentlyEnabled,
        })
        .then(() => {
          mutate("/integrations/edr/sentinelone");
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={196} />
  ) : (
    <>
      <IntegrationCard
        name={"SentinelOne"}
        description="AI-powered endpoint protection platform for real-time threat detection and automated response."
        url={{
          title: "sentinelone.com",
          href: "https://www.sentinelone.com/",
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
      <SentinelOneSetup
        account={account}
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => setEnabled(true)}
      />
    </>
  );
};

type ConfigurationProps = {
  config: SentinelOneIntegration;
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
      <SentinelOneConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
        config={config}
      />
    </>
  );
};

export function matchAttributesReducer(
  state: SentinelOneMatchAttributes,
  action: { type: string; payload: boolean | number },
) {
  switch (action.type) {
    case "SET_ACTIVE_THREATS":
      return { ...state, active_threats: action.payload as number };
    case "SET_ENCRYPTED_APPLICATIONS":
      const encryptedApplications = action.payload as boolean;
      return {
        ...state,
        encrypted_applications: encryptedApplications ? true : undefined,
      };
    case "SET_FIREWALL_ENABLED":
      const firewallEnabled = action.payload as boolean;
      return { ...state, firewall_enabled: firewallEnabled ? true : undefined };
    case "SET_INFECTED": {
      const block = action.payload as boolean;
      return { ...state, infected: block ? false : undefined };
    }
    case "SET_IS_ACTIVE": {
      const isActive = action.payload as boolean;
      return {
        ...state,
        is_active: isActive ? true : undefined,
        operational_state: isActive ? "na" : undefined,
      };
    }
    case "SET_IS_UP_TO_DATE":
      const isUpToDate = action.payload as boolean;
      return { ...state, is_up_to_date: isUpToDate ? true : undefined };
    case "SET_NETWORK_STATUS": {
      const isConnected = action.payload as boolean;
      return {
        ...state,
        network_status: isConnected ? "connected" : undefined,
      };
    }
    default:
      return state;
  }
}

export const isValidSentinelOneApiUrl = (url: string) => {
  if (!url) return false;
  return (
    validator.isValidUrl(url) &&
    (url.endsWith("sentinelone.net") || url.endsWith("sentinelone.net/")) &&
    url.startsWith("https://")
  );
};
