import Button from "@components/Button";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { useApiCall } from "@utils/api";
import { Settings } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/generic-http.png";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { EventStream } from "@/interfaces/EventStream";
import GenericHTTPModal from "@/modules/integrations/event-streaming/generic-http/GenericHTTPModal";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

export default function GenericHTTP() {
  const { permission } = usePermissions();

  const { mutate } = useSWRConfig();
  const { data: eventStreamIntegrations, isLoading } = useFetchApi<
    EventStream[]
  >(
    "/integrations/event-streaming",
    false,
    false,
    permission.event_streaming.read,
  );

  const genericHTTPIntegration = eventStreamIntegrations?.find(
    (integration) => integration.platform === "generic_http",
  );

  const isOtherIntegrationEnabled = eventStreamIntegrations?.some(
    (integration) =>
      integration.enabled && integration.platform !== "generic_http",
  );

  const integrationRequest = useApiCall<EventStream>(
    "/integrations/event-streaming",
  );

  const [open, setOpen] = useState(false);

  const toggleSwitch = async () => {
    if (!genericHTTPIntegration) return setOpen(true);
    const enabled = !genericHTTPIntegration.enabled;

    notify({
      title: `Generic HTTP Integration`,
      description: `HTTP Integration was successfully ${
        enabled ? "enabled" : "disabled"
      }.`,
      promise: integrationRequest
        .put(
          { config: genericHTTPIntegration.config, enabled },
          "/" + genericHTTPIntegration.id,
        )
        .then(() => {
          mutate("/integrations/event-streaming");
        }),
      loadingMessage: `${
        enabled ? "Enabling" : "Disabling"
      } Generic HTTP Integration...,`,
    });
  };

  return isLoading ? (
    <SkeletonIntegration />
  ) : (
    <>
      <IntegrationCard
        name="Generic HTTP"
        description="Provide your custom HTTP endpoint to stream audit & traffic events."
        url={{
          title: "docs.netbird.io",
          href: "https://docs.netbird.io/how-to/stream-activity-to-generic-http",
        }}
        image={integrationImage}
        data={genericHTTPIntegration}
        switchState={
          !genericHTTPIntegration ? false : genericHTTPIntegration.enabled
        }
        disabled={
          genericHTTPIntegration?.enabled
            ? !permission.event_streaming.update
            : isOtherIntegrationEnabled || !permission.event_streaming.create
        }
        onEnabledChange={toggleSwitch}
        onSetup={() => setOpen(true)}
      >
        <Button
          variant={"secondary"}
          size={"xs"}
          className={"items-center"}
          onClick={() => setOpen(true)}
        >
          <Settings size={14} />
          Configuration
        </Button>
      </IntegrationCard>
      <GenericHTTPModal
        open={open}
        onOpenChange={setOpen}
        stream={genericHTTPIntegration}
      />
    </>
  );
}
