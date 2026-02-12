import Button from "@components/Button";
import Card from "@components/Card";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { Callout } from "@components/Callout";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import {
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  REVERSE_PROXY_DOMAIN_VERIFICATION_LINK,
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: ReverseProxyDomain;
  onStartVerification: (domain: ReverseProxyDomain) => void;
  targetCluster?: string;
};

export const CustomDomainVerificationModal = ({
  open,
  onOpenChange,
  domain,
  onStartVerification,
  targetCluster,
}: Props) => {
  const { domains } = useReverseProxies();

  const handleStartVerification = () => {
    onStartVerification(domain);
    onOpenChange(false);
  };

  // Get free domains (proxy clusters) as CNAME targets
  const freeDomains =
    domains?.filter((d) => d.type === ReverseProxyDomainType.FREE) || [];

  // Use provided target cluster, or fall back to first available
  const cnameTarget = targetCluster || freeDomains[0]?.domain || "";

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"relative max-w-[600px]"} showClose={true}>
        <GradientFadedBackground />
        <ModalHeader
          icon={<GlobeIcon size={20} />}
          title={"Verify Domain"}
          description={domain.domain}
          color={"netbird"}
        />
        <div className={"px-8 flex flex-col gap-0 pb-6"}>
          <Steps className={"pt-0 stepper-bg-variant"}>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                Sign in to your domain name provider (e.g. cloudflare.com or
                godaddy.com)
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                Add the <Mark>CNAME record</Mark> below to your DNS
                configuration for <Mark>{domain.domain}</Mark>
              </p>
            </Steps.Step>
          </Steps>
          <div className={"flex flex-col gap-6"}>
            {!cnameTarget ? (
              <Callout variant={"warning"}>
                No proxy clusters are currently connected. Please ensure at
                least one proxy is running to configure DNS verification. <br />
                Learn more about{" "}
                <InlineLink
                  href={REVERSE_PROXY_CLUSTERS_DOCS_LINK}
                  target={"_blank"}
                >
                  Proxy Clusters
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Callout>
            ) : (
              <>
                <Card className={"w-full"}>
                  <Card.List>
                    <Card.ListItem
                      copy
                      copyText={`*.${domain.domain}`}
                      label={"CNAME Record"}
                      value={`*.${domain.domain}`}
                    />
                    <Card.ListItem
                      copy
                      copyText={cnameTarget}
                      label={"CNAME Content"}
                      value={cnameTarget}
                    />
                  </Card.List>
                </Card>

                {!targetCluster && freeDomains.length > 1 && (
                  <Callout variant={"info"}>
                    <span className="font-medium">
                      Available proxy clusters:
                    </span>{" "}
                    {freeDomains.map((d) => d.domain).join(", ")}. Choose the
                    cluster closest to your users for best performance.
                  </Callout>
                )}

                <Callout variant={"warning"}>
                  DNS changes may take some time to propagate. If NetBird does
                  not find the record immediately, please wait up to 24 hours
                  and try again.
                </Callout>
              </>
            )}
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                href={REVERSE_PROXY_DOMAIN_VERIFICATION_LINK}
                target={"_blank"}
              >
                Domain Verification
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Verify Later</Button>
            </ModalClose>

            <Button variant={"primary"} onClick={handleStartVerification}>
              Start Verification
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
