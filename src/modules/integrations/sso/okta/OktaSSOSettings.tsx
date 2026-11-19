import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Modal, ModalContent } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { cn } from "@utils/helpers";
import { AlertOctagon, GlobeIcon, KeyRound, Settings } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import integrationImage from "@/assets/integrations/okta.png";
import { useDialog } from "@/contexts/DialogProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { DomainValidationStatus } from "@/interfaces/Account";
import {
  EnterpriseConnection,
  EnterpriseConnectionDomain,
} from "@/interfaces/IdentityProvider";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { DomainVerificationCard } from "@/modules/integrations/sso/DomainVerificationCard";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";
import { useEnterpriseConnections } from "@/modules/integrations/sso/useEnterpriseConnections";

type Props = {
  config: EnterpriseConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export const OktaSsoSettings = ({ open, onOpenChange, config }: Props) => {
  const t = useTranslations();
  const { deleteConnection, addDomain, verifyDomain, mutate } =
    useEnterpriseConnections();
  const [tab, setTab] = useState("domains");
  const [domain, setDomain] = useState("");
  const { confirm } = useDialog();

  const deleteIntegration = async () => {
    const choice = await confirm({
      title: t("integrations.ssoDeleteTitle"),
      description: t("integrations.ssoDeleteDescription"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: t("integrations.ssoIntegrationTitle"),
      description: t("integrations.idpDeletedDescription", {
        name: t("integrations.idpOkta"),
      }),
      promise: deleteConnection(config.id).then(() => {
        onOpenChange(false);
        mutate();
      }),
      loadingMessage: t("integrations.idpDeletingLoading"),
    });
  };

  const addDomainHandler = async () => {
    notify({
      title: t("integrations.ssoDomainsTitle"),
      description: t("integrations.ssoDomainAdded", { domain }),
      promise: addDomain(config.id, domain).then((res) => {
        const result = res as unknown as EnterpriseConnectionDomain;
        mutate();
        if (result?.validation_status == DomainValidationStatus.PENDING) {
          setDomainVerification({
            name: result?.name || "",
            token: result?.validation_token || "",
          });
          setDomainVerificationModal(true);
        }
      }),
      loadingMessage: t("integrations.ssoAddDomainLoading"),
    });
  };

  const [domainVerificationModal, setDomainVerificationModal] = useState(false);
  const [domainVerification, setDomainVerification] = useState({
    name: "",
    token: "",
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <DomainVerificationModal
        open={domainVerificationModal}
        onOpenChange={setDomainVerificationModal}
        domain={domainVerification.name}
        token={domainVerification.token}
        onVerify={() => verifyDomain(config.id, domainVerification.name)}
      />
      <ModalContent
        maxWidthClass={cn("relative max-w-xl")}
        showClose={true}
        className={""}
        autoFocus={false}
      >
        <GradientFadedBackground />

        <IntegrationModalHeader
          image={integrationImage}
          title={t("integrations.ssoConfigurationTitle")}
          description={t("integrations.ssoConfigurationDescription")}
        />

        <Tabs
          defaultValue={tab}
          onValueChange={(v) => setTab(v)}
          className={"mt-6"}
        >
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"domains"}>
              <GlobeIcon
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              {t("common.domains")}
            </TabsTrigger>
            <TabsTrigger value={"settings"}>
              <Settings
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              {t("common.configuration")}
            </TabsTrigger>
            <TabsTrigger value={"danger"}>
              <AlertOctagon
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              {t("common.dangerZoneTitle")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={"settings"} className={"px-8 text-sm"}>
            <div className={"flex-col gap-3 flex"}>
              <Card className={"w-full"}>
                <Card.List>
                  <Card.ListItem
                    copy
                    copyText={config?.client_id}
                    label={
                      <>
                        <GlobeIcon size={16} />
                        {t("integrations.ssoOktaDomain")}
                      </>
                    }
                    value={config?.discovery_domain}
                  />
                  <Card.ListItem
                    copy
                    copyText={config?.client_id}
                    label={
                      <>
                        <KeyRound size={16} />
                        {t("integrations.idpClientId")}
                      </>
                    }
                    value={config?.client_id}
                  />
                  <Card.ListItem
                    label={
                      <>
                        <KeyRound size={16} />
                        {t("integrations.idpClientSecret")}
                      </>
                    }
                    value={"********"}
                  />
                </Card.List>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value={"domains"} className={"px-8"}>
            <form
              className={"flex gap-4 w-full justify-between mb-6"}
              onSubmit={(e) => {
                e.preventDefault();
                addDomainHandler().then();
              }}
            >
              <div className={"w-full"}>
                <Input
                  className={"w-full text-sm"}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder={"e.g. company.com"}
                />
              </div>
              <Button type={"submit"} variant={"secondaryLighter"}>
                {t("integrations.addDomain")}
              </Button>
            </form>
            <div className={"flex flex-col gap-3"}>
              {config?.domains?.map((domain) => (
                <DomainVerificationCard
                  key={domain.name}
                  domain={domain}
                  connectionId={config.id}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value={"danger"} className={"px-8"}>
            <div>
              <Label>
                <div className={"flex gap-2 items-center"}>
                  <AlertOctagon size={16} />
                  {t("common.deleteIntegration")}
                </div>
              </Label>
              <HelpText className={"max-w-lg mt-2"}>
                {t.rich("integrations.ssoDeleteWarning", {
                  br: () => <br />,
                })}
              </HelpText>
            </div>
            <Button
              variant={"danger"}
              size={"xs"}
              className={"mt-3"}
              onClick={deleteIntegration}
            >
              {t("common.deleteIntegration")}
            </Button>
          </TabsContent>
        </Tabs>
      </ModalContent>
    </Modal>
  );
};
