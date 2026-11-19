import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent } from "@components/modal/Modal";
import Steps from "@components/Steps";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

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
  const translate = useTranslations();
  const [open, setOpen] = useState(false);

  const isSubnet = resource?.type === "subnet";
  const isWildCard = resource?.address.includes("*");
  const isHost = resource?.type === "host";

  const pingAddress = useMemo(() => {
    let a = resource?.address || "";
    if (isHost) {
      if (a.endsWith("/32")) a = a.slice(0, -3);
      else if (a.endsWith("/128")) a = a.slice(0, -4);
    }
    if (isWildCard) return `(any subdomain of ${a})`;
    return isSubnet ? `(resource ip in your subnet)` : a;
  }, [isWildCard, isHost, isSubnet, resource?.address]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center max-w-sm mx-auto"}>
          {translate("onboarding.letSPutThatConnectionToTheTest")}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {translate(
            "onboarding.niceWorkConnectingYourClientDeviceNowLetSHave",
          )}
        </div>
      </div>

      <Steps className={"stepper-bg-variant"}>
        <Steps.Step step={1}>
          <p className={"!text-nb-gray-300"}>
            {translate.rich(
              "onboarding.openYourCommandLineAndRunThisCommandFromTo",
              {
                part0: (chunks) => (
                  <span className={cn(device && "text-nb-gray-100 dark:text-white")}>{chunks}</span>
                ),
                part1: () => device?.name || "your device",
              },
            )}
          </p>
          <Code showCopyIcon={!isSubnet && !isWildCard}>
            ping {pingAddress}
          </Code>
        </Steps.Step>
        <Steps.Step step={2} line={false} className={"pb-0"} disabled={!device}>
          <p className={"!text-nb-gray-300"}>
            {translate(
              "onboarding.everythingWorkingGreatYouCanNowContinueWithTheOnboarding",
            )}{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/troubleshooting-client"}
              target={"_blank"}
              onClick={onTroubleshootingClick}
            >
              {translate("onboarding.troubleshootingGuide")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </p>
          <div className={"mt-2"}>
            <Button
              variant={"secondaryLighter"}
              onClick={onNext}
              className={"w-full"}
            >
              {translate("onboarding.itWorksContinue")}
            </Button>
          </div>
        </Steps.Step>
      </Steps>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent>
          <SetupModalContent title={translate("onboarding.installNetBird")} />
        </ModalContent>
      </Modal>
    </div>
  );
};
