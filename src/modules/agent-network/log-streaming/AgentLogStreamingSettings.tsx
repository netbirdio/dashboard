"use client";

import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { notify } from "@components/Notification";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import useFetchApi, { ErrorResponse, useApiCall } from "@utils/api";
import { RadioTowerIcon, Settings } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import genericHttpImage from "@/assets/integrations/generic-http.png";
import { useIsFeatureLocked } from "@/cloud/cloud-hooks/useIsFeatureLocked";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useIsLicensed } from "@/hooks/useIsLicensed";
import {
  LOG_STREAMING_URL,
  LogStreamingIntegration,
  LogStreamingPlatform,
} from "@/modules/agent-network/log-streaming/logStreaming";
import LogStreamingModal, {
  PLATFORM_NAMES,
} from "@/modules/agent-network/log-streaming/LogStreamingModal";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import { IntegrationCard } from "@/modules/integrations/IntegrationCard";

const PLATFORMS: {
  platform: LogStreamingPlatform;
  image: React.ComponentProps<typeof IntegrationCard>["image"];
  description: string;
  docs: { title: string; href: string };
}[] = [
  {
    platform: "http",
    image: genericHttpImage,
    description:
      "POST access logs as JSON batches to your own endpoint, optionally signed with Standard Webhooks headers.",
    docs: {
      title: "standardwebhooks.com",
      href: "https://www.standardwebhooks.com/",
    },
  },
  {
    platform: "otlp_grpc",
    image: <RadioTowerIcon size={22} className={"text-nb-gray-300"} />,
    description:
      "Export access logs over OTLP/gRPC to an OpenTelemetry Collector or any compatible log backend.",
    docs: {
      title: "opentelemetry.io",
      href: "https://opentelemetry.io/docs/specs/otlp/",
    },
  },
];

// Log streaming shares Event Streaming's plan: Business on Cloud, a license
// on self-hosted. While locked the endpoint isn't called, so an open-source
// server shows the upsell rather than the not-available notice.
export default function AgentLogStreamingSettings() {
  const isLocked = useIsFeatureLocked("EVENT_STREAMING");
  const { isLoading: licenseLoading } = useIsLicensed();
  // Self-hosted resolves the license with a probe; wait for it rather than
  // flashing the locked state at licensed servers.
  if (licenseLoading) return <CardsSkeleton />;
  if (!isLocked) return <LogStreamingSettings />;
  return (
    <>
      <div className={"p-default pb-6"}>
        <LockedFeatureInfoCard
          featureText={"Log Streaming"}
          feature={"EVENT_STREAMING"}
          className={"mt-0"}
        />
      </div>
      <LockedFeatureOverlay feature={"EVENT_STREAMING"} opacity={100}>
        {/* Disabled like Event Streaming's cards on an unlicensed server. */}
        <LogStreamingCards canCreate={false} />
      </LockedFeatureOverlay>
    </>
  );
}

function LogStreamingSettings() {
  const { permission } = usePermissions();
  const perms = permission?.["agent_network.settings"];
  const { data, error, isLoading } = useFetchApi<LogStreamingIntegration[]>(
    LOG_STREAMING_URL,
    true,
    false,
    !!perms?.read,
    { shouldRetryOnError: false },
  );

  if (isLoading) return <CardsSkeleton />;

  if (error) {
    const notDeployed = (error as ErrorResponse).code === 404;
    return (
      <div className={"p-default max-w-4xl"}>
        <Callout variant={notDeployed ? "default" : "error"}>
          {notDeployed
            ? "Log streaming is not available on this management server yet."
            : `Log streaming settings could not be loaded: ${
                (error as ErrorResponse).message ?? "unknown error"
              }`}
        </Callout>
      </div>
    );
  }

  return (
    <LogStreamingCards
      integrations={data}
      canCreate={!!perms?.create}
      canUpdate={!!perms?.update}
      canDelete={!!perms?.delete}
    />
  );
}

function LogStreamingCards({
  integrations,
  canCreate,
  canUpdate = false,
  canDelete = false,
}: {
  integrations?: LogStreamingIntegration[];
  canCreate: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const enabled = integrations?.find((i) => i.enabled);
  return (
    <div
      className={
        "p-default pb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl auto-rows-fr"
      }
    >
      {PLATFORMS.map((p) => (
        <LogStreamingCard
          key={p.platform}
          {...p}
          integration={integrations?.find((i) => i.platform === p.platform)}
          otherEnabled={!!enabled && enabled.platform !== p.platform}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}

function LogStreamingCard({
  platform,
  image,
  description,
  docs,
  integration,
  otherEnabled,
  canCreate,
  canUpdate,
  canDelete,
}: (typeof PLATFORMS)[number] & {
  integration?: LogStreamingIntegration;
  otherEnabled: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { mutate } = useSWRConfig();
  const request = useApiCall<LogStreamingIntegration>(LOG_STREAMING_URL, true);
  const [open, setOpen] = useState(false);
  const name = PLATFORM_NAMES[platform];

  const toggle = () => {
    if (!integration) return setOpen(true);
    const enabled = !integration.enabled;
    notify({
      title: `${name} Log Streaming`,
      description: `Log streaming was ${enabled ? "enabled" : "disabled"}.`,
      loadingMessage: enabled
        ? "Sending a test entry..."
        : "Disabling log streaming...",
      // An empty config leaves the stored one untouched; enabling re-tests
      // the endpoint and the toast shows its error if it rejects.
      promise: request
        .put({ enabled, config: {} }, `/${integration.id}`)
        .then(() => mutate(LOG_STREAMING_URL)),
    });
  };

  // Only one integration can be enabled per account, so the other card is
  // locked until this one is disabled.
  const disabled = integration
    ? (!integration.enabled && otherEnabled) || !canUpdate
    : otherEnabled || !canCreate;

  return (
    <>
      <IntegrationCard
        name={name}
        description={description}
        url={docs}
        image={image}
        data={integration}
        switchState={!!integration?.enabled}
        disabled={disabled}
        onEnabledChange={toggle}
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
      <LogStreamingModal
        open={open}
        onOpenChange={setOpen}
        platform={platform}
        image={image}
        integration={integration}
        canDelete={canDelete}
      />
    </>
  );
}

function CardsSkeleton() {
  return (
    <div
      className={"p-default grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl"}
    >
      <SkeletonIntegration />
      <SkeletonIntegration />
    </div>
  );
}
