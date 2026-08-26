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
import integrationImage from "@/assets/integrations/huntress.png";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { HuntressIntegration, HuntressMatchAttributes } from "@/interfaces/EDR";
import { Group } from "@/interfaces/Group";
import HuntressConfiguration from "@/modules/integrations/edr/huntress/HuntressConfiguration";
import HuntressSetup from "@/modules/integrations/edr/huntress/HuntressSetup";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

type Props = {
  account: Account;
};

export const HUNTRESS_DOCUMENTATION_URL =
  "https://support.huntress.io/hc/en-us/articles/4408425850515-Managed-Microsoft-Defender-Terms-and-Definitions";

export const HUNTRESS_NETBIRD_DOCUMENTATION_URL =
  "https://docs.netbird.io/how-to/huntress-edr";

export const Huntress = ({ account }: Props) => {
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);
  const { permission } = usePermissions();
  const { confirm } = useDialog();

  const {
    huntress: integration,
    isAnyIntegrationEnabled,
    isHuntressLoading: isLoading,
  } = useIntegrations();
  const integrationRequest = useApiCall<HuntressIntegration>(
    "/integrations/edr/huntress",
  );

  const [enabled, setEnabled] = useState(!!integration?.enabled);

  useEffect(() => {
    setEnabled(!!integration?.enabled);
  }, [integration]);

  const toggleSwitch = async () => {
    if (!integration?.last_synced_interval) return setSetupModal(true);
    const isCurrentlyEnabled = integration.enabled;

    const choice = isCurrentlyEnabled
      ? await confirm({
          title: `Disable Huntress?`,
          description: `Are you sure you want to disable the Huntress integration?`,
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
      title: "Huntress Integration",
      description: `Huntress was successfully ${
        isCurrentlyEnabled ? "disabled" : "enabled"
      }`,
      promise: integrationRequest
        .put({
          ...integration,
          groups,
          enabled: !isCurrentlyEnabled,
        })
        .then(() => {
          mutate("/integrations/edr/huntress");
        }),
      loadingMessage: "Updating integration...",
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={196} />
  ) : (
    <>
      <IntegrationCard
        name={"Huntress"}
        description="EDR with comprehensive, enterprise-grade protection, continuously backed by 24/7 AI-assisted SOC."
        url={{
          title: "huntress.com",
          href: "https://huntress.com/",
        }}
        image={integrationImage}
        data={integration?.last_synced_interval ? integration : undefined}
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
      <HuntressSetup
        account={account}
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => setEnabled(true)}
      />
    </>
  );
};

type ConfigurationProps = {
  config: HuntressIntegration;
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
      <HuntressConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
        config={config}
      />
    </>
  );
};

export function matchAttributesReducer(
  state: HuntressMatchAttributes,
  action: { type: string; payload: string },
) {
  switch (action.type) {
    case "SET_DEFENDER_POLICY_STATUS":
      return { ...state, defender_policy_status: action.payload };
    case "SET_DEFENDER_STATUS":
      return { ...state, defender_status: action.payload };
    case "SET_DEFENDER_SUBSTATUS":
      return { ...state, defender_substatus: action.payload };
    case "SET_FIREWALL_STATUS": {
      return { ...state, firewall_status: action.payload };
    }
    default:
      return state;
  }
}
