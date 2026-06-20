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
import {
  DomainValidationStatus,
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
  const { deleteConnection, addDomain, mutate } = useEnterpriseConnections();
  const [tab, setTab] = useState("domains");
  const [domain, setDomain] = useState("");
  const { confirm } = useDialog();

  const deleteIntegration = async () => {
    const choice = await confirm({
      title: `Delete Integration?`,
      description:
        "Are you sure you want to delete this integration? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: "Okta SSO Integration",
      description: `Okta was successfully deleted`,
      promise: deleteConnection(config.id).then(() => {
        onOpenChange(false);
        mutate();
      }),
      loadingMessage: "Deleting integration...",
    });
  };

  const addDomainHandler = async () => {
    notify({
      title: "Okta Domains",
      description: `${domain} has been added`,
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
      loadingMessage: "Adding domain...",
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
        connectionId={config.id}
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
          title={"Okta SSO Configuration"}
          description={
            "Use Okta as a Single Sign-On provider to authenticate users."
          }
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
              Domains
            </TabsTrigger>
            <TabsTrigger value={"settings"}>
              <Settings
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Configuration
            </TabsTrigger>
            <TabsTrigger value={"danger"}>
              <AlertOctagon
                size={16}
                className={
                  "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
                }
              />
              Danger Zone
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
                        Okta Domain
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
                        Client ID
                      </>
                    }
                    value={config?.client_id}
                  />
                  <Card.ListItem
                    label={
                      <>
                        <KeyRound size={16} />
                        Client Secret
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
                Add Domain
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
                  Delete Integration
                </div>
              </Label>
              <HelpText className={"max-w-lg mt-2"}>
                Deleting this integration will remove the ability to use Okta as
                an SSO provider. <br /> If you delete the integration you will
                need to reconfigure it again to enable the Single Sign-On.
              </HelpText>
            </div>
            <Button
              variant={"danger"}
              size={"xs"}
              className={"mt-3"}
              onClick={deleteIntegration}
            >
              Delete Integration
            </Button>
          </TabsContent>
        </Tabs>
      </ModalContent>
    </Modal>
  );
};
