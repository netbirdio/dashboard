import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { IconBrandUbuntu } from "@tabler/icons-react";
import { GRPC_API_ORIGIN } from "@utils/netbird";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { RoutingPeerSetupKeyInfo } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  setupKey?: string;
  setupKeyContent?: React.ReactNode;
  setupKeyPlaceholder?: string;
  showSetupKeyInfo?: boolean;
  hostname?: string;
};

export default function DockerTab({
  setupKey,
  setupKeyContent,
  setupKeyPlaceholder,
  showSetupKeyInfo = false,
  hostname,
}: Readonly<Props>) {
  const t = useTranslations();
  const offset = setupKeyContent ? 1 : 0;
  return (
    <TabsContent value={String(OperatingSystem.DOCKER)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <IconBrandUbuntu size={16} />
          {t("setupNetbirdModal.installOnUbuntuDocker")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>{t("setupNetbirdModal.installDocker")}</p>
            <div className={"flex gap-4 mt-1"}>
              <Link
                href={"https://docs.docker.com/engine/install/"}
                passHref
                target={"_blank"}
              >
                <Button variant={"primary"}>
                  <ExternalLinkIcon size={14} />
                  {t("setupNetbirdModal.dockerGuide")}
                </Button>
              </Link>
            </div>
          </Steps.Step>
          {setupKeyContent && (
            <Steps.Step step={2}>{setupKeyContent}</Steps.Step>
          )}
          <Steps.Step step={2 + offset}>
            <p>
              {t("setupNetbirdModal.runNetBirdContainer")}
              {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
            </p>
            <Code>
              <Code.Line>docker run -d --restart=unless-stopped \</Code.Line>
              <Code.Line> --cap-add=NET_ADMIN \</Code.Line>
              <Code.Line>
                {" "}
                -e NB_SETUP_KEY=
                <span className={"text-netbird"}>
                  {setupKey ?? setupKeyPlaceholder ?? "SETUP_KEY"}
                </span>{" "}
                \
              </Code.Line>

              {hostname && (
                <Code.Line>
                  {" "}
                  -e NB_HOSTNAME=
                  <span className={"text-netbird"}>{`'${hostname}'`}</span> \
                </Code.Line>
              )}

              <Code.Line> -v netbird-client:/var/lib/netbird \</Code.Line>
              {GRPC_API_ORIGIN && (
                <Code.Line>
                  {" "}
                  -e NB_MANAGEMENT_URL=
                  <span className={"text-netbird"}>{GRPC_API_ORIGIN}</span> \
                </Code.Line>
              )}
              <Code.Line> netbirdio/netbird:latest</Code.Line>
            </Code>
          </Steps.Step>
          <Steps.Step step={3 + offset} line={false}>
            <p>{t("setupNetbirdModal.readDocumentation")}</p>
            <InlineLink
              href={"https://docs.netbird.io/how-to/installation/docker"}
              passHref={true}
              target={"_blank"}
            >
              {t("setupNetbirdModal.runningInDocker")}
            </InlineLink>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
