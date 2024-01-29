import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { useApiCall } from "@utils/api";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/datadog.png";
import { useDialog } from "@/contexts/DialogProvider";
import { EventStream } from "@/interfaces/EventStream";
import DatadogSetup from "@/modules/integrations/event-streaming/datadog/DatadogSetup";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

export default function Datadog() {
  const { mutate } = useSWRConfig();
  const { data: eventStreamIntegrations, isLoading } = useFetchApi<
    EventStream[]
  >("/integrations/event-streaming");

  const dataDogSettings = eventStreamIntegrations?.find(
    (integration) => integration.platform === "datadog",
  );

  const integrationRequest = useApiCall<EventStream>(
    "/integrations/event-streaming",
  );

  const [setupModal, setSetupModal] = useState(false);
  const { confirm } = useDialog();

  const toggleSwitch = async () => {
    if (!dataDogSettings) return setSetupModal(true);

    const choice = await confirm({
      title: `Disconnect Datadog?`,
      description:
        "Disconnecting deletes the current configuration. You will need to start the setup process again.",
      confirmText: "Disconnect",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice) return;

    notify({
      title: "Datadog Integration",
      description: `Datadog was successfully disconnected`,
      promise: integrationRequest.del({}, "/" + dataDogSettings.id).then(() => {
        mutate("/integrations/event-streaming");
      }),
      loadingMessage: "Disconnecting integration...",
    });
  };

  return isLoading ? (
    <>
      <SkeletonIntegration />
    </>
  ) : (
    <>
      <IntegrationCard
        name="Datadog"
        description="Datadog is a monitoring service for cloud-scale applications."
        url={{
          title: "datadoghq.com",
          href: "https://www.datadoghq.com/",
        }}
        image={integrationImage}
        data={dataDogSettings}
        switchState={!dataDogSettings ? false : dataDogSettings.enabled}
        onEnabledChange={toggleSwitch}
        onSetup={() => setSetupModal(true)}
      ></IntegrationCard>
      <DatadogSetup open={setupModal} onOpenChange={setSetupModal} />
    </>
  );
}
