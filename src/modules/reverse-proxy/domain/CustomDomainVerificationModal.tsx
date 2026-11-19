import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Card from "@components/Card";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  REVERSE_PROXY_CLUSTERS_DOCS_LINK,
  REVERSE_PROXY_DOMAIN_VERIFICATION_LINK,
  ReverseProxyDomain,
  ReverseProxyDomainType,
} from "@/interfaces/ReverseProxy";
import { isNetBirdCloud } from "@/utils/netbird";

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
  const t = useTranslations();
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
          title={t("common.verifyDomain")}
          description={domain.domain}
          color={"netbird"}
        />
        <div className={"px-8 flex flex-col gap-0 pb-6"}>
          <Steps className={"pt-0 stepper-bg-variant"}>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {t(
                  "reverseProxy.signInToYourDomainNameProviderEGCloudflareComOr",
                )}
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {t.rich("reverseProxy.domainAddDnsRecord", {
                  record: (chunks) => <Mark>{chunks}</Mark>,
                  domain: (chunks) => <Mark>{chunks}</Mark>,
                  domainName: domain.domain,
                })}
              </p>
            </Steps.Step>
          </Steps>
          <div className={"flex flex-col gap-6"}>
            {!cnameTarget ? (
              isNetBirdCloud() ? (
                <Callout variant={"warning"}>
                  {t.rich("reverseProxy.noClustersConnectedHelp", {
                    status: (chunks) => (
                      <InlineLink
                        href="https://status.netbird.io/"
                        target="_blank"
                      >
                        {chunks}
                      </InlineLink>
                    ),
                    support: (chunks) => (
                      <InlineLink href="mailto:support@netbird.io">
                        {chunks}
                      </InlineLink>
                    ),
                  })}
                </Callout>
              ) : (
                <Callout variant={"warning"}>
                  {t(
                    "reverseProxy.noProxyClustersAreCurrentlyConnectedPleaseEnsureAtLeastOneProxyText",
                  )}{" "}
                  <br />
                  {t("reverseProxy.learnMoreAbout")}{" "}
                  <InlineLink
                    href={REVERSE_PROXY_CLUSTERS_DOCS_LINK}
                    target={"_blank"}
                  >
                    {t("reverseProxy.proxyClusters")}
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </Callout>
              )
            ) : (
              <>
                <Card className={"w-full"}>
                  <Card.List>
                    <Card.ListItem
                      copy
                      copyText={`*.${domain.domain}`}
                      label={t("reverseProxy.cNAMERecord")}
                      value={`*.${domain.domain}`}
                    />
                    <Card.ListItem
                      copy
                      copyText={cnameTarget}
                      label={t("reverseProxy.cNAMEContent")}
                      value={cnameTarget}
                    />
                  </Card.List>
                </Card>

                {!targetCluster && freeDomains.length > 1 && (
                  <Callout variant={"info"}>
                    {t.rich("reverseProxy.domainAvailableClusters", {
                      label: (chunks) => (
                        <span className="font-medium">{chunks}</span>
                      ),
                      clusters: freeDomains.map((d) => d.domain).join(", "),
                    })}
                  </Callout>
                )}

                <Callout variant={"warning"}>
                  {t(
                    "reverseProxy.dNSChangesMayTakeSomeTimeToPropagateIfNetBirdDoesNot",
                  )}
                </Callout>
              </>
            )}
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              {t("reverseProxy.learnMoreAbout")}
              <InlineLink
                href={REVERSE_PROXY_DOMAIN_VERIFICATION_LINK}
                target={"_blank"}
              >
                {t("reverseProxy.domainVerification")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} data-testid={"verify-domain-later"}>
                {t("reverseProxy.verifyLater")}
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              onClick={handleStartVerification}
              disabled={!cnameTarget}
            >
              {t("reverseProxy.startVerification")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
