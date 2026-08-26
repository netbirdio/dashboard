import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import {
  Box,
  GlobeIcon,
  KeyRoundIcon,
  Loader2,
  PlusCircle,
  Repeat,
  Settings2,
  Shield,
} from "lucide-react";
import React, { useState } from "react";
import integrationImage from "@/assets/integrations/okta.png";
import { DomainValidationStatus } from "@/interfaces/IdentityProvider";
import { EstimatedSetupTime } from "@/modules/integrations/EstimatedSetupTime";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";
import { useEnterpriseConnections } from "@/modules/integrations/sso/useEnterpriseConnections";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OktaSSOSetup({ open, onOpenChange }: Props) {
  const { createOrUpdateConnection, mutate } = useEnterpriseConnections();
  const [step, setStep] = useState(0);
  const maxSteps = 2;

  const [oktaDomain, setOktaDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [primaryEmailDomain, setPrimaryEmailDomain] = useState("");

  const [domainVerificationModal, setDomainVerificationModal] = useState(false);
  const [verificationDomain, setVerificationDomain] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const connect = () => {
    if (isLoading) return;
    setIsLoading(true);
    notify({
      title: "Okta SSO Integration",
      description: "Okta SSO was successfully connected",
      loadingMessage: "Connecting Okta SSO...",
      promise: createOrUpdateConnection({
        domain: oktaDomain,
        client_id: clientId,
        client_secret: btoa(clientSecret),
        email_domain: primaryEmailDomain,
        strategy: "okta",
        provider: "okta",
      })
        .then((connections) => {
          onOpenChange(false);

          const oktaConnection = connections.find(
            (connection) => connection.strategy === "okta",
          );
          if (!oktaConnection) {
            notify({
              title: "Okta SSO Integration",
              description: "Failed to connect Okta SSO",
            });
            return;
          }
          const domain = oktaConnection.domains?.[0] || undefined;
          if (!domain) {
            notify({
              title: "Okta SSO Integration",
              description: "Failed to connect Okta SSO",
            });
            return;
          }
          if (domain.validation_status !== DomainValidationStatus.VERIFIED) {
            setVerificationDomain(domain.name);
            setVerificationToken(domain.validation_token);
            setConnectionId(oktaConnection.id);
            setDomainVerificationModal(true);
          }
          mutate();
        })
        .finally(() => setIsLoading(false)),
    });
  };

  return (
    <>
      <DomainVerificationModal
        open={domainVerificationModal}
        onOpenChange={setDomainVerificationModal}
        domain={verificationDomain}
        token={verificationToken}
        connectionId={connectionId}
      />

      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent
          maxWidthClass={cn("relative", step == 0 ? "max-w-md" : "max-w-xl")}
          showClose={true}
          className={""}
          onEscapeKeyDown={(e) => step > 0 && e.preventDefault()}
          onInteractOutside={(e) => step > 0 && e.preventDefault()}
          onPointerDownOutside={(e) => step > 0 && e.preventDefault()}
        >
          <GradientFadedBackground />

          {step > 0 && (
            <div
              className={"flex gap-2 w-full items-center justify-center mb-4"}
            >
              {Array.from({ length: maxSteps }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-8 h-1 rounded-full bg-nb-gray-800",
                    step >= index + 1 && "bg-netbird",
                  )}
                />
              ))}
            </div>
          )}

          <IntegrationModalHeader
            image={integrationImage}
            title={"Connect NetBird with Okta SSO"}
            description={
              "Use Okta as a Single Sign-On provider to authenticate users. Follow the steps below to get started."
            }
          />

          {step == 0 && (
            <div
              className={
                "px-8 py-3 flex z-0 flex-col gap-0 text-sm mb-3 text-center justify-center items-center"
              }
            >
              <div
                className={
                  "mt-6 text-base font-medium text-nb-gray-100 flex gap-2 items-center justify-center"
                }
              >
                <Shield size={16} />
                Required Permissions
              </div>
              <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
                Ensure that you have an{" "}
                <span className={"text-nb-gray-100 font-semibold"}>
                  Okta user account
                </span>{" "}
                with the following{" "}
                <span className={"text-nb-gray-100 font-semibold"}>
                  permissions
                </span>
                .{" "}
                {
                  "If you don't have the required permissions, ask your Okta administrator to grant them to you."
                }
              </p>
              <div
                className={
                  "flex items-center flex-col gap-0 mt-2 w-full justify-center max-w-lg"
                }
              >
                <div
                  className={
                    "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
                  }
                >
                  <PlusCircle size={14} className={"text-sky-500"} />
                  Add Okta applications
                </div>
                <div
                  className={
                    "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
                  }
                >
                  <Settings2 size={14} className={"text-sky-500"} />
                  Configure Okta applications
                </div>
              </div>
            </div>
          )}

          {step == 1 && (
            <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
              <p className={"font-medium flex gap-3 items-center text-base"}>
                <Box size={20} />
                Install NetBird application for Okta
              </p>
              <Steps>
                <Steps.Step step={1}>
                  <p>
                    Navigate to{" "}
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={"https://www.okta.com/integrations/netbird"}
                    >
                      Okta Integration Network
                    </InlineLink>
                  </p>
                </Steps.Step>
                <Steps.Step step={2}>
                  <p className={"font-normal"}>
                    Click <Mark>+ Add Integration</Mark> and then{" "}
                    <Mark>Done</Mark>
                  </p>
                </Steps.Step>
                <Steps.Step step={3} line={false}>
                  <p>
                    After installing the application go to the{" "}
                    <Mark>Assignments</Mark> tab, select the <Mark>Assign</Mark>{" "}
                    and click <Mark>Assign to People</Mark> and assign your user
                    to the application
                  </p>
                </Steps.Step>
              </Steps>
            </div>
          )}

          {step == 2 && (
            <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
              <p className={"font-medium flex gap-3 items-center text-base"}>
                <KeyRoundIcon size={20} />
                Enter your Okta details
              </p>
              <Steps>
                <Steps.Step step={1}>
                  <p className={"font-normal"}>
                    Click on the <Mark>{"Sign On"}</Mark> tab and enter your
                    client credentials
                  </p>
                  <Input
                    customPrefix={
                      <span className={"min-w-[90px]"}>Client ID</span>
                    }
                    placeholder={"0obflxtwxoVQcur0z3f3"}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                  <Input
                    customPrefix={
                      <span className={"min-w-[90px]"}>Client Secret</span>
                    }
                    placeholder={
                      "jfgbU1Wu3XWAKhGUF4d-PX54DSm3pAQCyNtpxp7Nu8Ij22stSz8_6KnWbO4nQBIb"
                    }
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </Steps.Step>
                <Steps.Step step={2}>
                  <p className={"font-normal"}>
                    Under your user profile, enter your{" "}
                    <Mark>Okta account domain</Mark>
                  </p>
                  <Input
                    customPrefix={<GlobeIcon size={16} />}
                    placeholder={"mydomain.okta.com"}
                    value={oktaDomain}
                    onChange={(e) => setOktaDomain(e.target.value)}
                  />
                </Steps.Step>
                <Steps.Step step={3} line={false}>
                  <p className={"font-normal"}>
                    Enter your
                    <Mark>Primary E-Mail Domain</Mark> which will later be used
                    to log in to NetBird.
                  </p>
                  <Input
                    customPrefix={<GlobeIcon size={16} />}
                    placeholder={"mycompany.com"}
                    value={primaryEmailDomain}
                    onChange={(e) => setPrimaryEmailDomain(e.target.value)}
                  />
                </Steps.Step>
              </Steps>
            </div>
          )}

          <ModalFooter className={"items-center gap-4"}>
            {step > 0 && (
              <Button
                variant={"secondary"}
                className={"w-full"}
                onClick={() => setStep(step - 1)}
              >
                <IconArrowLeft size={16} />
                Back
              </Button>
            )}
            {step >= 0 && step < maxSteps && (
              <Button
                variant={"primary"}
                className={"w-full"}
                onClick={() => setStep(step + 1)}
              >
                {step == 0 ? "Get Started" : "Continue"}
                <IconArrowRight size={16} />
              </Button>
            )}
            {step == maxSteps && (
              <Button
                variant={"primary"}
                className={"w-full"}
                onClick={connect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={16} className={"animate-spin"} />
                ) : (
                  <Repeat size={16} />
                )}
                Connect
              </Button>
            )}
          </ModalFooter>
          {step == 0 && <EstimatedSetupTime minutes={5} />}
        </ModalContent>
      </Modal>
    </>
  );
}
