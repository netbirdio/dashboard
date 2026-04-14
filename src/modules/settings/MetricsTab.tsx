import Breadcrumbs from "@components/Breadcrumbs";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import InlineLink from "@components/InlineLink";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import {
  ChartNoAxesCombined,
  ExternalLinkIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function MetricsTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [metricsPushEnabled, setMetricsPushEnabled] = useState(
    account.settings?.metrics_push_enabled ?? false,
  );

  const toggleMetricsPush = async (toggle: boolean) => {
    notify({
      title: "Metrics",
      description: `Metrics push successfully ${
        toggle ? "enabled" : "disabled"
      }.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            metrics_push_enabled: toggle,
          },
        })
        .then(() => {
          setMetricsPushEnabled(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Updating metrics setting...",
    });
  };

  return (
    <Tabs.Content value={"metrics"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=metrics"}
            label={"Metrics"}
            icon={<ChartNoAxesCombined size={14} />}
            active
          />
        </Breadcrumbs>
        <div>
          <h1>Metrics</h1>
          <Paragraph>
            Help us improve NetBird by sharing performance metrics
            such as connection timing, sync duration, and login latency.
          </Paragraph>
          <Paragraph>
            Learn more about{" "}
            <InlineLink
              href={
                "https://docs.netbird.io/selfhosted/client-metrics"
              }
              target={"_blank"}
            >
              Client Metrics
              <ExternalLinkIcon size={12} />
            </InlineLink>
            in our documentation.
          </Paragraph>
        </div>

        <FancyToggleSwitch
          className={"mt-6"}
          value={metricsPushEnabled}
          onChange={toggleMetricsPush}
          label={
            <>
              <ChartNoAxesCombined size={15} />
              Share performance metrics
            </>
          }
          helpText={
            "When enabled, clients will periodically send performance data to help us identify and fix issues."
          }
          disabled={!permission.settings.update}
        />
      </div>
    </Tabs.Content>
  );
}
