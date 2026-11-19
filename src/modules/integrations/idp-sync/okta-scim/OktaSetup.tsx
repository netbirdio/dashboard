import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Lightbox } from "@components/ui/Lightbox";
import { Mark } from "@components/ui/Mark";
import { MinimalList } from "@components/ui/MinimalList";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Box,
  Clock4,
  FolderGit2,
  LogInIcon,
  MailIcon,
  PlusCircle,
  Settings2,
  Share2,
  Shield,
  UserCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useEmbeddedIdentityProviders } from "@/hooks/useEmbeddedIdentityProviders";
import integrationImage from "@/assets/integrations/okta.png";
import { useTranslations } from "@/i18n/LocaleProvider";
import { OktaIntegration } from "@/interfaces/IdentityProvider";
import oktaGroupsAssignments from "@/modules/integrations/idp-sync/okta-scim/images/okta-groups-assignments.png";
import oktaSCIMToApp from "@/modules/integrations/idp-sync/okta-scim/images/okta-scim-to-app-sync-enabled.png";
import oktaSSO from "@/modules/integrations/idp-sync/okta-scim/images/okta-sso-configuration.png";
import oktaSyncGroups from "@/modules/integrations/idp-sync/okta-scim/images/okta-sync-groups.png";
import { EmbeddedIdentityProviderSelect } from "@/modules/integrations/idp-sync/EmbeddedIdentityProviderSelect";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { useEnterpriseConnections } from "@/modules/integrations/sso/useEnterpriseConnections";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function OktaSetup({ open, onOpenChange, onSuccess }: Props) {
  const [authToken, setAuthToken] = useState("");
  const [connectorId, setConnectorId] = useState("");
  const { oktaConnection } = useEnterpriseConnections();

  const integrationsRequest = useApiCall<OktaIntegration[]>(
    "/integrations/okta-scim-idp",
  );

  const authTokenRequest = useApiCall<OktaIntegration>(
    "/integrations/okta-scim-idp",
    true,
  ).post;

  useEffect(() => {
    if (!open) return;
    if (!oktaConnection) return;
    const getAuthToken = async () => {
      const integration = await integrationsRequest.get();
      if (!isEmpty(integration)) {
        const integrationId = integration[0].id;
        if (authToken != "") return authToken;
        const okta = await authTokenRequest(
          {
            connection_name: oktaConnection.name,
          },
          `/${integrationId}/token`,
        );
        if (!okta) return "";
        return okta.auth_token;
      } else {
        const okta = await authTokenRequest({
          connection_name: oktaConnection.name,
          ...(connectorId ? { connector_id: connectorId } : {}),
        });
        if (!okta) return "";
        return okta.auth_token;
      }
    };

    getAuthToken().then((t) => setAuthToken(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {open && (
        <SetupContent
          authToken={authToken}
          connectorId={connectorId}
          onConnectorIdChange={setConnectorId}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess && onSuccess();
          }}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess: () => void;
  authToken: string;
  connectorId?: string;
  onConnectorIdChange?: (value: string) => void;
};

export function SetupContent({
  onSuccess,
  authToken,
  connectorId = "",
  onConnectorIdChange,
}: ModalProps) {
  const translate = useTranslations();
  const { isEmbeddedIdPEnabled } = useEmbeddedIdentityProviders();
  const [step, setStep] = useState(isEmbeddedIdPEnabled ? -1 : 0);
  const maxSteps = 5;

  return (
    <ModalContent
      maxWidthClass={cn(
        "relative",
        step == 0
          ? "max-w-lg"
          : step == 2
          ? "max-w-2xl"
          : step == 1
          ? "max-w-lg"
          : "max-w-xl",
        step === -1 && "max-w-lg",
      )}
      showClose={true}
      className={""}
      onEscapeKeyDown={(e) => step > 0 && e.preventDefault()}
      onInteractOutside={(e) => step > 0 && e.preventDefault()}
      onPointerDownOutside={(e) => step > 0 && e.preventDefault()}
    >
      <GradientFadedBackground />

      {step > 0 && (
        <div className={"flex gap-2 w-full items-center justify-center mb-4"}>
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
        title={translate("integrations.idpConnectTitle", {
          name: translate("integrations.idpOkta"),
        })}
        description={translate("integrations.idpConnectDescription", {
          name: translate("integrations.idpOkta"),
        })}
      />

      {step === -1 && onConnectorIdChange && (
        <EmbeddedIdentityProviderSelect
          value={connectorId}
          onChange={onConnectorIdChange}
          location="setup"
          filterByType={["okta"]}
        />
      )}

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
            {translate("common.requiredPermissions")}
          </div>
          <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
            {translate.rich("integrations.idpPermissionsIntro", {
              account: () => (
                <span className={"text-nb-gray-100 font-semibold"}>
                  {translate("integrations.idpOktaUserAccount")}
                </span>
              ),
              requirement: () => (
                <span className={"text-nb-gray-100 font-semibold"}>
                  {translate("integrations.idpPermissionsWord")}
                </span>
              ),
              followup: translate("integrations.idpPermissionsMissing", {
                administrator: translate("integrations.idpOkta"),
              }),
            })}
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
              {translate("integrations.idpOktaAddApps")}
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              {translate("integrations.idpOktaConfigApps")}
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <LogInIcon size={20} />
            {translate("integrations.idpOktaConfigureSso")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaOpenApplication", {
                  path: (chunks) => <Mark>{chunks}</Mark>,
                  app: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaGoToSignOn", {
                  path: (chunks) => <Mark>{chunks}</Mark>,
                  edit: () => <Mark>{translate("common.edit")}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaSetUsernameFormat", {
                  details: () => (
                    <Mark>{translate("integrations.idpCredentialsDetails")}</Mark>
                  ),
                  format: () => (
                    <Mark>
                      {translate("integrations.idpApplicationUsernameFormat")}
                    </Mark>
                  ),
                  email: () => <Mark>{translate("common.email")}</Mark>,
                  save: () => <Mark>{translate("common.save")}</Mark>,
                })}
              </p>
              <Lightbox image={oktaSSO} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Share2 size={20} />
            {translate("integrations.idpEnableOktaScim")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpOktaOpenNetbirdApp", {
                  path: (chunks) => <Mark>{chunks}</Mark>,
                  app: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaOpenApiIntegration", {
                  provisioning: (chunks) => <Mark>{chunks}</Mark>,
                  integration: (chunks) => <Mark>{chunks}</Mark>,
                  configure: () => (
                    <Mark>
                      {translate("integrations.idpConfigureApiIntegration")}
                    </Mark>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaInsertToken", {
                  enable: () => (
                    <Mark>
                      {translate("integrations.idpEnableApiIntegration")}
                    </Mark>
                  ),
                  token: () => (
                    <Mark>{translate("integrations.idpApiToken")}</Mark>
                  ),
                })}
              </p>
              <MinimalList
                data={[
                  {
                    label: translate("integrations.idpAuthorizationBearer"),
                    value: authToken,
                  },
                ]}
              />
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaTestCredentials", {
                  test: () => (
                    <Mark>
                      {translate("integrations.idpTestApiCredentials")}
                    </Mark>
                  ),
                  save: () => <Mark>{translate("common.save")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            {translate("integrations.idpConfigureScimToNetbird")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpOktaOpenToApp", {
                  path: (chunks) => <Mark>{chunks}</Mark>,
                  edit: () => <Mark>{translate("common.edit")}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaEnableUserActions", {
                  enable: () => <>{translate("common.enable") + " "}</>,
                  create: (chunks) => <Mark>{chunks}</Mark>,
                  update: (chunks) => <Mark>{chunks}</Mark>,
                  deactivate: (chunks) => <Mark>{chunks}</Mark>,
                  save: () => <Mark>{translate("common.save")}</Mark>,
                })}
              </p>
              <Lightbox image={oktaSCIMToApp} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={20} />
            {translate("integrations.idpSyncUsers")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpOktaOpenAssignments", {
                  assignments: (chunks) => <Mark>{chunks}</Mark>,
                  assign: () => <Mark>{translate("common.assign")}</Mark>,
                  groups: () => (
                    <Mark>{translate("integrations.idpAssignToGroups")}</Mark>
                  ),
                })}
              </p>
              <Lightbox image={oktaGroupsAssignments} />
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaSelectGroups", {
                  assign: () => <Mark>{translate("common.assign")}</Mark>,
                  back: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaAssignmentDone", {
                  select: () => <>{translate("common.select") + " "}</>,
                  done: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={20} />
            {translate("integrations.idpSyncGroups")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpOktaOpenPushGroups", {
                  push: (chunks) => <Mark>{chunks}</Mark>,
                  pushAgain: (chunks) => <Mark>{chunks}</Mark>,
                  find: () => (
                    <Mark>
                      {translate("integrations.idpFindGroupsByName")}
                    </Mark>
                  ),
                })}
              </p>
              <Lightbox image={oktaSyncGroups} />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGroupsToPush", {
                  save: () => <Mark>{translate("common.save")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      <ModalFooter className={"items-center gap-4"}>
        {step === -1 && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={() => setStep(step + 1)}
            disabled={!connectorId || connectorId === ""}
          >
            {translate("common.continue")}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step > 0 && (
          <Button
            variant={"secondary"}
            className={"w-full"}
            onClick={() => setStep(step - 1)}
          >
            <IconArrowLeft size={16} />
            {translate("common.back")}
          </Button>
        )}
        {step >= 0 && step < maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={() => setStep(step + 1)}
          >
            {step == 0
              ? translate("integrations.idpGetStarted")
              : translate("common.continue")}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step == maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={() => {
              onSuccess();
            }}
          >
            {translate("common.finishSetup")}
          </Button>
        )}
      </ModalFooter>
      {(step == 0 || step == -1) && (
        <div
          className={
            "text-center z-0 mt-2.5 text-xs text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
          }
        >
          <Clock4 size={12} />
          <div>
            {translate.rich("integrations.idpEstimatedSetupTime", {
              duration: () => (
                <span className={"font-medium"}>
                  {" "}
                  {translate("integrations.idpSetupDurationMedium")}
                </span>
              ),
            })}
          </div>
        </div>
      )}
    </ModalContent>
  );
}

export function SetupSSOContent() {
  const translate = useTranslations();
  const [step, setStep] = useState(0);
  const maxSteps = 2;

  return (
    <ModalContent
      maxWidthClass={cn("relative", step == 2 ? "max-w-xl" : "max-w-lg")}
      showClose={true}
      className={""}
      onEscapeKeyDown={(e) => step > 0 && e.preventDefault()}
      onInteractOutside={(e) => step > 0 && e.preventDefault()}
      onPointerDownOutside={(e) => step > 0 && e.preventDefault()}
    >
      <GradientFadedBackground />

      {step > 0 && (
        <div className={"flex gap-2 w-full items-center justify-center mb-4"}>
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
        title={translate("integrations.idpConnectTitle", {
          name: translate("integrations.idpOkta"),
        })}
        description={translate("integrations.idpConnectDescription", {
          name: translate("integrations.idpOkta"),
        })}
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
            {translate("common.requiredPermissions")}
          </div>
          <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
            {translate.rich("integrations.idpPermissionsIntro", {
              account: () => (
                <span className={"text-nb-gray-100 font-semibold"}>
                  {translate("integrations.idpOktaUserAccount")}
                </span>
              ),
              requirement: () => (
                <span className={"text-nb-gray-100 font-semibold"}>
                  {translate("integrations.idpPermissionsWord")}
                </span>
              ),
              followup: translate("integrations.idpPermissionsMissing", {
                administrator: translate("integrations.idpOkta"),
              }),
            })}
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
              {translate("integrations.idpOktaAddApps")}
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              {translate("integrations.idpOktaConfigApps")}
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            {translate("integrations.idpSsoInstallApp")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpOktaNavigateTo", {
                  link: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={"https://www.okta.com/integrations/netbird"}
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaInstallDone", {
                  add: (chunks) => <Mark>{chunks}</Mark>,
                  done: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p>
                {translate.rich("integrations.idpOktaAssignPeople", {
                  assignments: (chunks) => <Mark>{chunks}</Mark>,
                  assign: () => <Mark>{translate("common.assign")}</Mark>,
                  people: () => (
                    <Mark>{translate("integrations.idpAssignToPeople")}</Mark>
                  ),
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <MailIcon size={20} />
            {translate("integrations.idpShareOktaDetails")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaNoteCredentials", {
                  signOn: (chunks) => <Mark>{chunks}</Mark>,
                  br: () => <br />,
                  clientId: () => (
                    <Mark>{translate("integrations.idpClientId")}</Mark>
                  ),
                  secret: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaNoteDomain", {
                  domain: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaShareDetails", {
                  clientId: () => (
                    <Mark>{translate("integrations.idpClientId")}</Mark>
                  ),
                  secret: (chunks) => <Mark>{chunks}</Mark>,
                  domain: (chunks) => <Mark>{chunks}</Mark>,
                  email: (chunks) => <Mark>{chunks}</Mark>,
                  user: "user's",
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpOktaWaitForEmail", {
                  app: (chunks) => (
                    <InlineLink href={"https://app.netbird.io"}>
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
          </Steps>

          <div className={"flex flex-col gap-6 max-w-lg mb-4 z-0"}>
            <div
              className={
                "bg-netbird-950 px-6 py-4 rounded-md border border-netbird-500 "
              }
            >
              <p className={"!text-netbird-200"}>
                {translate.rich("integrations.idpShareOktaHelp", {
                  tool: (chunks) => (
                    <InlineLink
                      href={"mailto:support@netbird.io"}
                      className={"inline !text-netbird-500 font-medium"}
                    >
                      {" "}
                      {chunks}
                    </InlineLink>
                  ),
                  email: (chunks) => (
                    <InlineLink
                      href={"mailto:support@netbird.io"}
                      className={"inline !text-netbird-500 font-medium"}
                    >
                      {" "}
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </div>
          </div>
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
            {translate("common.back")}
          </Button>
        )}
        {step >= 0 && step < maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            onClick={() => setStep(step + 1)}
          >
            {step == 0
              ? translate("integrations.idpGetStarted")
              : translate("common.continue")}
            <IconArrowRight size={16} />
          </Button>
        )}
        {step == maxSteps && (
          <ModalClose asChild={true}>
            <Button variant={"primary"} className={"w-full"}>
              {translate("common.close")}
            </Button>
          </ModalClose>
        )}
      </ModalFooter>
      {step == 0 && (
        <div
          className={
            "text-center z-0 mt-2.5 text-xs text-nb-gray-300 flex items-center justify-center gap-2 font-normal"
          }
        >
          <Clock4 size={12} />
          <div>
            {translate.rich("integrations.idpEstimatedSetupTime", {
              duration: () => (
                <span className={"font-medium"}>
                  {" "}
                  {translate("integrations.idpSetupDurationShort")}
                </span>
              ),
            })}
          </div>
        </div>
      )}
    </ModalContent>
  );
}
