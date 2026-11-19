import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Mark } from "@components/ui/Mark";
import { MinimalList } from "@components/ui/MinimalList";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isAuth0 } from "@utils/netbird";
import { isEmpty, trim } from "lodash";
import {
  BoxIcon,
  Clock4,
  ExternalLinkIcon,
  PlusCircle,
  Settings2,
  Shield,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useEmbeddedIdentityProviders } from "@/hooks/useEmbeddedIdentityProviders";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/generic-scim.png";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  IdentityProvider,
  ScimIntegration,
} from "@/interfaces/IdentityProvider";
import { EmbeddedIdentityProviderSelect } from "@/modules/integrations/idp-sync/EmbeddedIdentityProviderSelect";
import { GenericSCIMProps } from "@/modules/integrations/idp-sync/generic-scim/GenericSCIM";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { useSSOConnections } from "@/modules/integrations/sso/useSSOConnections";
import entraGetStarted from "@/modules/integrations/idp-sync/entra-scim/images/entra-provisioning-get-started.png";
import entraStartProvisioning from "@/modules/integrations/idp-sync/entra-scim/images/entra-provisioning-started.png";
import entraAssignUsers from "@/modules/integrations/idp-sync/entra-scim/images/entra-assign-users-groups.png";
import entraEditExternalId from "@/modules/integrations/idp-sync/entra-scim/images/entra-edit-externalid.png";
import entraGroupMapping from "@/modules/integrations/idp-sync/entra-scim/images/entra-group-attribute-mapping.png";
import { Lightbox } from "@components/ui/Lightbox";

interface Props extends GenericSCIMProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EntraSCIMSetup({
  open,
  onOpenChange,
  onSuccess,
  ...props
}: Props) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {open && (
        <SetupContent
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
          onClose={() => onOpenChange(false)}
          {...props}
        />
      )}
    </Modal>
  );
}

interface ModalProps extends GenericSCIMProps {
  onSuccess: () => void;
  onClose: () => void;
}

const maxWidthClasses = [
  "max-w-xl",
  "max-w-xl",
  "max-w-2xl",
  "max-w-xl",
  "max-w-xl",
  "max-w-xl",
  "max-w-xl",
  "max-w-xl",
];

export function SetupContent({
  onSuccess,
  name,
  image,
  onClose,
  provider = IdentityProvider.ENTRA,
}: ModalProps) {
  const translate = useTranslations();
  const { isEmbeddedIdPEnabled } = useEmbeddedIdentityProviders();
  const [step, setStep] = useState(isEmbeddedIdPEnabled ? -1 : 0);
  const [authToken, setAuthToken] = useState("");
  const { mutate } = useSWRConfig();
  const [connectorId, setConnectorId] = useState("");
  const [groupPrefixes, setGroupPrefixes] = useState<string[]>([]);
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>([]);
  const maxSteps = 6;
  const [integrationId, setIntegrationId] = useState("");
  const { entraConnection, isSSOLoading } = useSSOConnections();
  const scimProvider = provider;

  const integrations = useApiCall<ScimIntegration[]>(
    "/integrations/scim-idp",
    true,
  );

  const integrationRequest = useApiCall<ScimIntegration>(
    "/integrations/scim-idp",
    true,
  );

  const finishSetup = async () => {
    if (integrationId === "") {
      onClose();
      return;
    }
    notify({
      title: translate("integrations.idpIntegrationTitle", {
        name: name ?? "",
      }),
      description: translate("integrations.idpSetUpDescription", {
        name: name ?? "",
      }),
      promise: integrationRequest
        .put(
          {
            group_prefixes: groupPrefixes
              ? groupPrefixes.filter((prefix) => trim(prefix) !== "")
              : [],
            user_group_prefixes: userGroupPrefixes
              ? userGroupPrefixes.filter((prefix) => trim(prefix) !== "")
              : [],
            provider: scimProvider,
          },
          `/${integrationId}`,
        )
        .then(() => {
          mutate("/integrations/scim-idp");
          onSuccess();
        }),
      loadingMessage: translate("integrations.idpSettingUpLoading"),
    });
  };

  useEffect(() => {
    const getAuthToken = async () => {
      if (!entraConnection && isAuth0()) return;
      const integrationList = await integrations.get();
      const existingIntegration = integrationList?.find(
        (item) => item.provider === scimProvider,
      );

      if (!isEmpty(existingIntegration)) {
        const id = existingIntegration.id;
        if (authToken != "") return authToken;
        const res = await integrationRequest.post({}, `/${id}/token`);
        if (!res) return "";
        setIntegrationId(id);
        return res.auth_token;
      } else {
        const res = await integrationRequest.post({
          prefix: isAuth0()
            ? `${entraConnection?.strategy}|${entraConnection?.name}`
            : undefined,
          provider: scimProvider,
          group_prefixes: groupPrefixes
            ? groupPrefixes.filter((prefix) => trim(prefix) !== "")
            : [],
          user_group_prefixes: userGroupPrefixes
            ? userGroupPrefixes.filter((prefix) => trim(prefix) !== "")
            : [],
          ...(connectorId ? { connector_id: connectorId } : {}),
        });
        if (!res) return "";
        setIntegrationId(res.id);
        return res.auth_token;
      }
    };

    const authStep = provider === IdentityProvider.ENTRA ? 2 : 3;
    if (step === authStep && authToken === "") {
      getAuthToken().then((token) => {
        if (token !== undefined && token !== "") setAuthToken(token);
      });
    }
  }, [
    step,
    authToken,
    entraConnection,
    groupPrefixes,
    userGroupPrefixes,
    provider,
  ]);

  return (
    <ModalContent
      maxWidthClass={cn(
        "relative",
        step === -1 ? "max-w-lg" : maxWidthClasses[step],
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
        image={image || integrationImage}
        title={translate("integrations.idpConnectTitle", { name: name ?? "" })}
        description={translate("integrations.idpConnectDescription", {
          name: name ?? "",
        })}
      />

      {step === -1 && (
        <EmbeddedIdentityProviderSelect
          value={connectorId}
          onChange={setConnectorId}
          location="setup"
          filterByType={["entra"]}
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
                  {translate("integrations.idpAzureUserAccount")}
                </span>
              ),
              requirement: () => (
                <span className={"text-nb-gray-100 font-semibold"}>
                  {translate("integrations.idpPermissionsWord")}
                </span>
              ),
              followup: translate("integrations.idpPermissionsMissing", {
                administrator: "Azure AD",
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
              {translate("integrations.idpAzureCreateApps")}
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              {translate("integrations.idpAzureManageApps")}
            </div>
          </div>

          {!entraConnection && !isSSOLoading && isAuth0() && (
            <Callout className={"max-w-xl mt-5 text-left"} variant={"warning"}>
              <span>
                {translate.rich("integrations.idpEntraNotSignedIn", {
                  mark: (chunks) => (
                    <span className={"font-medium"}>{chunks}</span>
                  ),
                })}
              </span>
            </Callout>
          )}
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {translate("integrations.idpEntraConfigureScim")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpEntraOpenPortal", {
                  link: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={"https://portal.azure.com/"}
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraOpenEnterpriseApps", {
                  directory: (chunks) => <Mark>{chunks}</Mark>,
                  apps: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraCreateApplication", {
                  newApp: (chunks) => <Mark>{chunks}</Mark>,
                  ownApp: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={4}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraNameApplication", {
                  name: () => <Mark copy={true}>NetBird SCIM</Mark>,
                  option: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={5} line={false}>
              <p className={"font-normal"}>
                Click <Mark>{translate("common.create")}</Mark>
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {translate("integrations.idpEntraEnableProvisioning")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpEntraConnectApplication", {
                  manage: (chunks) => <Mark>{chunks}</Mark>,
                  provisioning: (chunks) => <Mark>{chunks}</Mark>,
                  connect: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <Lightbox image={entraGetStarted} />
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate("integrations.idpEntraFillForm")}
              </p>
              <MinimalList
                data={[
                  {
                    label: translate("integrations.idpEntraAuthenticationMethod"),
                    value: translate("integrations.idpEntraBearerAuthentication"),
                    noCopy: true,
                  },
                  {
                    label: translate("integrations.idpEntraTenantUrl"),
                    value:
                      "https://api.netbird.io/api/scim/v2?aadOptscim062020",
                  },
                  {
                    label: translate("integrations.idpSecretToken"),
                    value:
                      authToken === "" ? (
                        <Skeleton height={17} width={200} />
                      ) : (
                        authToken
                      ),
                    noCopy: authToken === "",
                  },
                ]}
              />
              <Callout variant={"warning"}>
                {translate.rich("integrations.idpScimFlagCallout", {
                  flag: (chunks) => (
                    <span className={"font-medium"}>{chunks}</span>
                  ),
                  more: () => (
                    <InlineLink
                      target={"_blank"}
                      href={
                        "https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-config-problem-scim-compatibility#flags-to-alter-the-scim-behavior"
                      }
                    >
                      {translate("common.learnMore")}
                      <ExternalLinkIcon size={12} />
                    </InlineLink>
                  ),
                })}
              </Callout>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraTestAndCreate", {
                  test: (chunks) => <Mark>{chunks}</Mark>,
                  create: () => <Mark>{translate("common.create")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {translate("integrations.idpGroupAttributeMapping")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpEntraOpenGroupMapping", {
                  mapping: (chunks) => <Mark>{chunks}</Mark>,
                  groups: () => <Mark>{translate("common.groups")}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraDeleteExternalId", {
                  externalId: (chunks) => <Mark>{chunks}</Mark>,
                  br: () => <br />,
                  delete: () => <Mark>{translate("common.delete")}</Mark>,
                })}
              </p>
              <Lightbox image={entraGroupMapping} />
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraSaveGroupMapping", {
                  save: () => <Mark>{translate("common.save")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {translate("integrations.idpEntraUserMapping")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpEntraOpenUserMapping", {
                  mapping: (chunks) => <Mark>{chunks}</Mark>,
                  users: () => <Mark>{translate("common.users")}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate("integrations.idpEntraKeepAttributes")}
              </p>
              <div>
                <Mark>userName</Mark>
                <Mark>active</Mark>
                <Mark>displayName</Mark>
                <Mark>emails[type eq "work"].value</Mark>
                <Mark>name.givenName</Mark>
                <Mark>name.familyName</Mark>
                <Mark>externalId</Mark>
              </div>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraEditExternalId", {
                  externalId: (chunks) => <Mark>{chunks}</Mark>,
                  br: () => <br />,
                  edit: () => <Mark>{translate("common.edit")}</Mark>,
                  source: () =>
                    translate.rich("integrations.idpExternalIdSource", {
                      source: (chunks) => <Mark>{chunks}</Mark>,
                      from: (chunks) => <Mark>{chunks}</Mark>,
                      to: (chunks) => <Mark>{chunks}</Mark>,
                      ok: (chunks) => <Mark>{chunks}</Mark>,
                    }),
                })}
              </p>
              <Lightbox image={entraEditExternalId} />
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraSaveUserMapping", {
                  save: () => <Mark>{translate("common.save")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {translate("integrations.idpEntraAssignUsers")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpEntraOpenUsersAndGroups", {
                  users: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <Lightbox image={entraAssignUsers} />
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraAddUserGroup", {
                  add: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraSaveAssignments", {
                  assign: () => <Mark>{translate("common.assign")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {translate("integrations.idpEntraStartProvisioning")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpEntraStartProvisioningHelp", {
                  overview: () => (
                    <Mark>{translate("integrations.tabOverview")}</Mark>
                  ),
                  start: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <Lightbox image={entraStartProvisioning} />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpEntraFinishProvisioning", {
                  br: () => <br />,
                  finish: () => (
                    <Mark>{translate("common.finishSetup")}</Mark>
                  ),
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
            disabled={!entraConnection && isAuth0()}
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
            onClick={finishSetup}
            disabled={integrationId === "" || authToken === ""}
          >
            {translate("common.finishSetup")}
          </Button>
        )}
      </ModalFooter>
      {(step == 0 || step == -1) && provider === IdentityProvider.ENTRA && (
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
                  {translate("integrations.idpSetupDurationLong")}
                </span>
              ),
            })}
          </div>
        </div>
      )}
    </ModalContent>
  );
}
