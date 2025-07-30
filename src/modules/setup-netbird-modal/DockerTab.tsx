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
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { RoutingPeerSetupKeyInfo } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  setupKey?: string;
  showSetupKeyInfo?: boolean;
  hostname?: string;
};

export default function DockerTab({
  setupKey,
  showSetupKeyInfo = false,
  hostname,
}: Readonly<Props>) {
  return (
    <TabsContent value={String(OperatingSystem.DOCKER)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <IconBrandUbuntu size={16} />
          Install on Ubuntu
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>Install Docker</p>
            <div className={"flex gap-4 mt-1"}>
              <Link
                href={"https://docs.docker.com/engine/install/"}
                passHref
                target={"_blank"}
              >
                <Button variant={"primary"}>
                  <ExternalLinkIcon size={14} />
                  Official Docker Installation Guide
                </Button>
              </Link>
            </div>
          </Steps.Step>
          <Steps.Step step={2}>
            <p>
              Run NetBird container
              {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
            </p>
            <Code>
              <Code.Line>docker run --rm -d \</Code.Line>
              <Code.Line> --cap-add=NET_ADMIN \</Code.Line>
              <Code.Line>
                {" "}
                -e NB_SETUP_KEY=
                <span className={"text-netbird"}>
                  {setupKey ?? "SETUP_KEY"}
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
          <Steps.Step step={3} line={false}>
            <p>Read our documentation</p>
            <InlineLink
              href={"https://docs.netbird.io/how-to/installation/docker"}
              passHref={true}
              target={"_blank"}
            >
              Running NetBird in Docker
            </InlineLink>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
