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
import integrationImage from "@/assets/integrations/fleetdm.png";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Account } from "@/interfaces/Account";
import {
  FleetDMIntegration,
  FleetDMMatchAttributes,
} from "@/interfaces/EDR";
import FleetDMConfiguration from "@/modules/integrations/edr/fleetdm/FleetDMConfiguration";
import FleetDMSetup from "@/modules/integrations/edr/fleetdm/FleetDMSetup";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";
import { Group } from "@/interfaces/Group";

type Props = {
  account: Account;
};

export const FleetDM = ({ account }: Props) => {
  const t = useTranslations();
  const { mutate } = useSWRConfig();
  const [setupModal, setSetupModal] = useState(false);
  const { permission } = usePermissions();
  const { confirm } = useDialog();

  const {
    fleetdm: integration,
    isAnyIntegrationEnabled,
    isFleetDMLoading: isLoading,
  } = useIntegrations();
  const integrationRequest = useApiCall<FleetDMIntegration>(
    "/integrations/edr/fleetdm",
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
          title: t("integrations.edrDisableTitle", { name: "FleetDM" }),
          description: t("integrations.edrDisableDescription", {
          name: "FleetDM",
        }),
          confirmText: t("common.disable"),
          cancelText: t("common.cancel"),
          type: "warning",
        })
      : true;
    if (!choice) return;

    const groups =
      integration.groups?.map((group) => (group as Group).id) || [];

    notify({
      title: t("integrations.edrIntegrationTitle", { name: "FleetDM" }),
      description: t("integrations.edrToggledDescription", {
        name: "FleetDM",
        state: isCurrentlyEnabled
          ? t("integrations.edrStateDisabled")
          : t("integrations.edrStateEnabled"),
      }),
      promise: integrationRequest
        .put({
          ...integration,
          groups,
          api_token: undefined,
          enabled: !isCurrentlyEnabled,
        })
        .then(() => {
          mutate("/integrations/edr/fleetdm");
        }),
      loadingMessage: t("integrations.edrUpdatingLoading"),
    });
  };

  return isLoading ? (
    <SkeletonIntegration loadingHeight={196} />
  ) : (
    <>
      <IntegrationCard
        name={"FleetDM"}
        description={t("integrations.edrFleetDMDescription")}
        url={{
          title: "fleetdm.com",
          href: "https://fleetdm.com/",
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
      <FleetDMSetup
        account={account}
        open={setupModal}
        onOpenChange={setSetupModal}
        onSuccess={() => setEnabled(true)}
      />
    </>
  );
};

type ConfigurationProps = {
  config: FleetDMIntegration;
};
const ConfigurationButton = ({ config }: ConfigurationProps) => {
  const t = useTranslations();
  const [configModal, setConfigModal] = useState(false);

  const lastSync = useMemo(() => {
    if (isEmpty(config?.last_synced_at))
      return t("integrations.edrNotSynchronized");
    return t("integrations.edrSyncedAgo", {
      time: dayjs().to(config?.last_synced_at),
    });
  }, [config, t]);

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
          {t("common.settings")}
        </Button>
      </div>
      <FleetDMConfiguration
        open={configModal}
        onOpenChange={setConfigModal}
        config={config}
      />
    </>
  );
};

export function matchAttributesReducer(
  state: FleetDMMatchAttributes,
  action: { type: string; payload: any },
) {
  switch (action.type) {
    case "SET_DISK_ENCRYPTION": {
      const val = action.payload as boolean;
      return { ...state, disk_encryption_enabled: val ? true : undefined };
    }
    case "SET_STATUS_ONLINE": {
      const val = action.payload as boolean;
      return { ...state, status_online: val ? true : undefined };
    }
    case "SET_FAILING_POLICIES_COUNT_MAX":
      return { ...state, failing_policies_count_max: action.payload as number | undefined };
    case "SET_VULNERABLE_SOFTWARE_COUNT_MAX":
      return { ...state, vulnerable_software_count_max: action.payload as number | undefined };
    case "SET_REQUIRED_POLICIES": {
      const raw = action.payload as string;
      const ids = raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
      return { ...state, required_policies: ids.length > 0 ? ids : undefined };
    }
    default:
      return state;
  }
}
