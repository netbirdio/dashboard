import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent } from "@components/modal/Modal";
import Steps from "@components/Steps";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  resource?: NetworkResource;
  device?: Peer;
  onNext?: () => void;
  onTroubleshootingClick?: () => void;
};

export const OnboardingTestResource = ({
  resource,
  device,
  onNext,
  onTroubleshootingClick,
}: Props) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const isSubnet = resource?.type === "subnet";
  const isWildCard = resource?.address.includes("*");
  const isHost = resource?.type === "host";

  const pingAddress = useMemo(() => {
    let a = resource?.address || "";
    if (isHost && a.endsWith("/32")) {
      a = a.slice(0, -3);
    }
    if (isWildCard) {
      return t("onboarding.anySubdomainOf", { address: a });
    }
    return isSubnet ? t("onboarding.resourceIpInYourSubnet") : a;
  }, [isWildCard, isHost, isSubnet, resource?.address]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {t("onboarding.testConnection")}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {t("onboarding.testConnectionDescription")}
        </div>
      </div>

      <Steps className={"stepper-bg-variant"}>
        <Steps.Step step={1}>
          <p className={"!text-nb-gray-300"}>
            {t("onboarding.openCommandLine")}{" "}
            {device?.name || t("onboarding.yourDevice")}{" "}
            {t("onboarding.toPingResource")}
          </p>
          <Code showCopyIcon={!isSubnet && !isWildCard}>
            ping {pingAddress}
          </Code>
        </Steps.Step>
        <Steps.Step step={2} line={false} className={"pb-0"} disabled={!device}>
          <p className={"!text-nb-gray-300"}>
            {t("onboarding.everythingWorking")}{" "}
            {t("onboarding.checkTroubleshooting")}
            <InlineLink
              href={"https://docs.netbird.io/how-to/troubleshooting-client"}
              target={"_blank"}
              onClick={onTroubleshootingClick}
            >
              {t("onboarding.troubleshootingGuide")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </p>
          <div className={"mt-2"}>
            <Button
              variant={"secondaryLighter"}
              onClick={onNext}
              className={"w-full"}
            >
              {t("onboarding.itWorksContinue")}
            </Button>
          </div>
        </Steps.Step>
      </Steps>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <SetupModalContent title={t("onboarding.installNetBird")} />
        </ModalContent>
      </Modal>
    </div>
  );
};
