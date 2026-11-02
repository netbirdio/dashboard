import FeatureCard, { FeatureCardStatus } from "@components/FeatureCard";
import useFetchApi from "@utils/api";
import { FileText } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import datadogLogo from "@/assets/integrations/datadog.png";
import firehoseLogo from "@/assets/integrations/firehose.png";
import genericHttpLogo from "@/assets/integrations/generic-http.png";
import s3Logo from "@/assets/integrations/s3.svg";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useIsLicensed } from "@/hooks/useIsLicensed";
import { EventStream } from "@/interfaces/EventStream";

type Platform = "datadog" | "s3" | "firehose" | "generic_http";
const platformImages: { [key in Platform]?: StaticImageData } = {
  datadog: datadogLogo,
  s3: s3Logo,
  firehose: firehoseLogo,
  generic_http: genericHttpLogo,
};

export const EventStreamingCard = () => {
  const { permission } = usePermissions();
  // Event Streaming is a licensed feature; the endpoint is not served on
  // open-source deployments, so skip the call there entirely.
  const { isLicensed } = useIsLicensed();

  const { data: eventStreamIntegrations } = useFetchApi<EventStream[]>(
    "/integrations/event-streaming",
    false,
    false,
    !!permission?.event_streaming?.read && isLicensed,
  );
  const activeSettings = eventStreamIntegrations?.find(
    (integration) => integration.enabled,
  );

  const activityLogo = activeSettings?.platform
    ? platformImages[activeSettings.platform as keyof typeof platformImages]
    : datadogLogo;

  const enabled = activeSettings ? activeSettings.enabled : false;
  const router = useRouter();

  return (
    <div className={"p-default pb-6"}>
      <FeatureCard
        onClick={() => router.push("/integrations?tab=event-streaming")}
        className={"max-w-[400px]"}
        icon={
          activeSettings?.enabled ? (
            <Image
              src={activityLogo as StaticImageData}
              alt={activeSettings.platform}
              className={"rounded-[4px]"}
            />
          ) : (
            <FileText size={16} />
          )
        }
        title={"Event Streaming"}
        action={<FeatureCardStatus enabled={enabled} />}
        description={"Stream your activity events to third-party services."}
      />
    </div>
  );
};
