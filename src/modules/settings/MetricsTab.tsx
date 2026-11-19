import Breadcrumbs from "@components/Breadcrumbs";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import InlineLink from "@components/InlineLink";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { ChartNoAxesCombined, ExternalLinkIcon } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function MetricsTab({ account }: Readonly<Props>) {
  const t = useTranslations();
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [metricsPushEnabled, setMetricsPushEnabled] = useState(
    account.settings?.metrics_push_enabled ?? false,
  );

  const toggleMetricsPush = async (toggle: boolean) => {
    notify({
      title: t("common.metrics"),
      description: t(
        toggle
          ? "settings.metricsStateEnabled"
          : "settings.metricsStateDisabled",
      ),
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
      loadingMessage: t("settings.metricsUpdating"),
    });
  };

  return (
    <Tabs.Content value={"metrics"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("common.settings")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=metrics"}
            label={t("common.metrics")}
            icon={<ChartNoAxesCombined size={14} />}
            active
          />
        </Breadcrumbs>
        <div>
          <h1>{t("common.metrics")}</h1>
          <Paragraph className={"block"}>
            {t("settings.metricsDescription")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/manage/client-metrics"}
              target={"_blank"}
            >
              {t("common.learnMore")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>

        <FancyToggleSwitch
          className={"mt-6"}
          value={metricsPushEnabled}
          onChange={toggleMetricsPush}
          label={
            <>
              <ChartNoAxesCombined size={15} />
              {t("settings.shareMetrics")}
            </>
          }
          helpText={t("settings.shareMetricsHelp")}
          disabled={!permission.settings.update}
        />
      </div>
    </Tabs.Content>
  );
}
