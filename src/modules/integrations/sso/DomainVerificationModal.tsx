import Button from "@components/Button";
import Card from "@components/Card";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  token: string;
  onVerify: () => Promise<unknown>;
};
export const DomainVerificationModal = ({
  open,
  onOpenChange,
  domain,
  token,
  onVerify,
}: Props) => {
  const translate = useTranslations();
  const startVerification = async () => {
    notify({
      title: translate("integrations.ssoDomainTitle"),
      description: translate("integrations.ssoDomainStarted", { domain }),
      promise: onVerify().then(() => {
        onOpenChange(false);
      }),
      loadingMessage: translate("integrations.ssoDomainStartingLoading"),
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-xl")}
        showClose={true}
        className={""}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <GradientFadedBackground />
        <ModalHeader
          icon={<GlobeIcon size={20} />}
          title={translate("integrations.ssoDomainVerifyTitle")}
          description={domain}
          color={"netbird"}
        />
        <div className={"px-8 flex flex-col gap-0"}>
          <Steps className={"pt-0"}>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate("integrations.ssoDomainSignIn")}
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.ssoDomainCopyTxt", {
                  record: (chunks) => <Mark>{chunks}</Mark>,
                  domain: () => <Mark>{domain}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
          <Card className={"w-full"}>
            <Card.List>
              <Card.ListItem
                copy
                copyText={translate("integrations.ssoTxtHost")}
                label={translate("common.host")}
                value={domain}
              />
              <Card.ListItem
                copy
                copyText={translate("integrations.ssoTxtValue")}
                label={translate("integrations.headerValue")}
                value={`nb-verification=${token}`}
              />
            </Card.List>
          </Card>

          <Paragraph className={"text-sm mt-4"}>
            {translate("integrations.ssoDomainCheckLater")}
          </Paragraph>

          <div
            className={
              "bg-nb-gray-900/70 px-4 py-3 rounded-md border border-nb-gray-800/70 my-6 !text-nb-gray-300 text-sm"
            }
          >
            {translate.rich("integrations.ssoDomainEmailFallback", {
              email: (chunks) => (
                <InlineLink
                  href={"mailto:support@netbird.io"}
                  className={"inline font-medium"}
                >
                  {" "}
                  {chunks}
                </InlineLink>
              ),
            })}
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              {translate.rich("integrations.ssoDomainLearnMore", {
                link: (chunks) => (
                  <InlineLink href={"#"} target={"_blank"}>
                    {chunks}
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                ),
              })}
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>
                {translate("integrations.ssoVerifyLater")}
              </Button>
            </ModalClose>

            <Button variant={"primary"} onClick={startVerification}>
              {translate("integrations.ssoStartVerification")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
