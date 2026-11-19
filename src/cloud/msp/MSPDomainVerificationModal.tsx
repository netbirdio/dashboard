import Button from "@components/Button";
import Card from "@components/Card";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import { Tenant } from "@/cloud/msp/interfaces/Tenant";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tenant: Tenant;
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export const MSPDomainVerificationModal = ({
  open,
  setOpen,
  tenant,
  token,
  onSuccess,
  onCancel,
}: Props) => {
  const translate = useTranslations();
  const { verifyDomain } = useTenants();
  const [isLoading, setIsLoading] = useState(false);

  const domain = tenant.domain;

  const verify = async () => {
    setIsLoading(true);
    verifyDomain(tenant, false)
      .then(() => onSuccess())
      .finally(() => setIsLoading(false));
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-xl")}
        showClose={false}
        className={""}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <GradientFadedBackground />
        <ModalHeader
          icon={<GlobeIcon size={20} />}
          title={translate("msp.verifyDomainOwnership")}
          description={domain}
          color={"netbird"}
        />
        <div className={"px-8 flex flex-col gap-0"}>
          <Steps className={"pt-0"}>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate("msp.signInToYourDomainNameProviderEGCloudflare")}
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate("msp.copyThe")}{" "}
                <Mark>{translate("msp.tXTRecord")}</Mark>{" "}
                {translate("msp.belowAndAddItToYourDNSConfigurationFor")}{" "}
                <Mark>{domain}</Mark>
              </p>
            </Steps.Step>
          </Steps>
          <Card className={"w-full"}>
            <Card.List>
              <Card.ListItem
                copy
                copyText={"TXT Host"}
                label={translate("common.host")}
                value={domain}
              />
              <Card.ListItem
                copy
                copyText={"TXT Value"}
                label={translate("msp.headerValue")}
                value={`nb-verification=${token}`}
              />
            </Card.List>
          </Card>

          <Paragraph className={"text-sm mt-4"}>
            {translate("msp.noteDNSChangesMayTakeSomeTimeToApplyIf")}
          </Paragraph>

          <div
            className={
              "bg-nb-gray-900/70 px-4 py-3 rounded-md border border-nb-gray-800/70 my-6 !text-nb-gray-300 text-sm"
            }
          >
            {translate.rich("msp.ifYouDoNotHaveAccessToYourDNSConfiguration", {
              part0: (chunks) => (
                <InlineLink
                  href={"mailto:support@netbird.io"}
                  className={"inline font-medium"}
                >
                  {chunks}
                </InlineLink>
              ),
            })}
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              {translate("trafficEvents.learnMoreAbout")}
              <InlineLink href={"#"} target={"_blank"}>
                {translate("msp.domainVerification")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <Button variant={"secondary"} onClick={onCancel}>
              {translate("msp.verifyLater")}
            </Button>
            <Button variant={"primary"} onClick={verify} disabled={isLoading}>
              {translate("msp.startVerification")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
