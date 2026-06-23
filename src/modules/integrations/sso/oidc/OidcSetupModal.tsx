import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, GlobeIcon, Repeat } from "lucide-react";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import React, { useState } from "react";
import { DomainValidationStatus } from "@/interfaces/IdentityProvider";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";
import { useEnterpriseConnections } from "@/modules/integrations/sso/useEnterpriseConnections";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  logo: StaticImport | string;
  discoveryPlaceholder?: string;
};

export default function OidcSetupModal({
  open,
  onOpenChange,
  name,
  logo,
  discoveryPlaceholder,
}: Readonly<Props>) {
  const { createOrUpdateConnection, mutate } = useEnterpriseConnections();
  const [step, setStep] = useState(0);
  const maxSteps = 1;

  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [primaryEmailDomain, setPrimaryEmailDomain] = useState("");

  const [domainVerificationModal, setDomainVerificationModal] = useState(false);
  const [verificationDomain, setVerificationDomain] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [connectionId, setConnectionId] = useState("");

  const connect = () => {
    notify({
      title: "Okta SSO Integration",
      description: "Okta SSO was successfully connected",
      loadingMessage: "Connecting Okta SSO...",
      promise: createOrUpdateConnection({
        discovery_url: discoveryUrl,
        client_id: clientId,
        client_secret: btoa(clientSecret),
        email_domain: primaryEmailDomain,
        strategy: "oidc",
        provider: name.toLowerCase() == "jumpcloud" ? "jumpcloud" : "keycloak",
      }).then((connections) => {
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
      }),
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
          maxWidthClass={cn("relative", "max-w-xl")}
          showClose={true}
          className={""}
          onEscapeKeyDown={(e) => step > 0 && e.preventDefault()}
          onInteractOutside={(e) => step > 0 && e.preventDefault()}
          onPointerDownOutside={(e) => step > 0 && e.preventDefault()}
        >
          <GradientFadedBackground />

          <IntegrationModalHeader
            image={logo}
            title={`Connect NetBird with ${name}`}
            description={`Use ${name} as a Single Sign-On provider to authenticate users. Follow the steps below to get started.`}
          />

          <div className={"px-8 py-3 flex flex-col gap-0 mt-2"}>
            <Steps>
              <Steps.Step step={1}>
                <p className={"font-normal"}>
                  {
                    "Obtaining the Client ID and Secret differs across providers. Please check your provider's documentation."
                  }
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

              {name.toLowerCase() !== "jumpcloud" && (
                <Steps.Step step={2}>
                  <p className={"font-normal"}>
                    Please provide the <Mark>OpenID Connect Discovery</Mark>{" "}
                    endpoint. It should be publicly accessible and SSL secured.
                  </p>
                  <Input
                    customPrefix={<GlobeIcon size={16} />}
                    placeholder={
                      discoveryPlaceholder ||
                      "https://id.mydomain.com/.well-known/openid-configuration"
                    }
                    value={discoveryUrl}
                    onChange={(e) => setDiscoveryUrl(e.target.value)}
                  />
                </Steps.Step>
              )}

              <Steps.Step
                step={name.toLowerCase() !== "jumpcloud" ? 3 : 2}
                line={false}
              >
                <p className={"font-normal"}>
                  Enter your
                  <Mark>Primary E-Mail Domain</Mark> which will later be used to
                  log in to NetBird.
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
          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
                  }
                  target={"_blank"}
                >
                  {name} Integration
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>

              <Button variant={"primary"}>
                <Repeat size={16} />
                Connect
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
