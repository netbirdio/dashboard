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
      title: `${name} Integration`,
      description: `${name} was successfully set up`,
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
      loadingMessage: "Setting up integration...",
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
        title={`Connect NetBird with ${name}`}
        description={`Start syncing your users and groups from ${name} to NetBird. Follow the steps below to get started.`}
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
            Required Permissions
          </div>
          <p className={"mt-2 !text-nb-gray-300 !leading-[1.5]"}>
            Ensure that you have an{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              Azure AD user account
            </span>{" "}
            with the following{" "}
            <span className={"text-nb-gray-100 font-semibold"}>
              permissions
            </span>
            .{" "}
            {
              "If you don't have the required permissions, ask your Azure AD administrator to grant them to you."
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
              Create Azure AD applications
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              Manage Azure AD applications
            </div>
          </div>

          {!entraConnection && !isSSOLoading && isAuth0() && (
            <Callout className={"max-w-xl mt-5 text-left"} variant={"warning"}>
              <span>
                It seems your account is currently not logged in via Entra ID.
                Please logout and simply sign in with the{" "}
                <span className={"font-medium"}>Continue with Entra ID </span>{" "}
                button on the login page.
              </span>
            </Callout>
          )}
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            Configure SCIM in Microsoft Entra ID
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to{"  "}
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={"https://portal.azure.com/"}
                >
                  Azure Portal
                </InlineLink>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Go to <Mark>Azure Active Directory</Mark> then{" "}
                <Mark>Enterprise applications</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                Click
                <Mark>+ New application</Mark> to create a new enterprise
                application and then click{" "}
                <Mark>+ Create your own application</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={4}>
              <p className={"font-normal"}>
                Enter <Mark copy={true}>NetBird SCIM</Mark> as the name and
                select
                <Mark>
                  Integrate any other application you don&apos;t find in the
                  gallery (Non-gallery)
                </Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={5} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Create</Mark>
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            Enable Provisioning
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Once the application is created, you&apos;ll be redirected to a
                getting started page. Click <Mark>Get started</Mark> in the{" "}
                <Mark>Provision User Accounts</Mark> section. Under the Create
                configuration section, click{" "}
                <Mark>Connect your application</Mark>
              </p>
              <Lightbox image={entraGetStarted} />
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Fill in the form with the following details
              </p>
              <MinimalList
                data={[
                  {
                    label: "Authentication Method",
                    value: "Bearer authentication",
                    noCopy: true,
                  },
                  {
                    label: "Tenant URL",
                    value:
                      "https://api.netbird.io/api/scim/v2?aadOptscim062020",
                  },
                  {
                    label: "Secret token",
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
                The <span className={"font-medium"}>'?aadOptscim062020'</span>{" "}
                flag appended to the Tenant URL is required to ensure Microsoft
                Entra ID sends SCIM 2.0 compliant requests.{" "}
                <InlineLink
                  target={"_blank"}
                  href={
                    "https://learn.microsoft.com/en-us/entra/identity/app-provisioning/application-provisioning-config-problem-scim-compatibility#flags-to-alter-the-scim-behavior"
                  }
                >
                  Learn more
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Callout>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                After that click <Mark>Test Connection</Mark> to verify the SCIM
                connection. If the connection is successful click{" "}
                <Mark>Create</Mark> to save the configuration.
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            Group Attribute Mapping
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to the <Mark>Attribute mapping</Mark> section and click{" "}
                <Mark>Provision Microsoft Entra ID Groups</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                In the attribute mappings list, locate the{" "}
                <Mark>externalId</Mark> row <br />
                and click <Mark>Delete</Mark>
              </p>
              <Lightbox image={entraGroupMapping} />
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Save</Mark> to apply the updated group attribute
                mapping configuration
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            User Attribute Mapping
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to the <Mark>Attribute mapping</Mark> section and click{" "}
                <Mark>Provision Microsoft Entra ID Users</Mark>
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                In the attribute mappings list, remove all attribute mappings
                except for the following:
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
                In the attribute mappings list, locate the{" "}
                <Mark>externalId</Mark> row <br />
                and click <Mark>Edit</Mark>. Change the{" "}
                <Mark>Source attribute</Mark> from <Mark>mailNickname</Mark> to{" "}
                <Mark>objectId</Mark> and click <Mark>Ok</Mark> to save the
                change
              </p>
              <Lightbox image={entraEditExternalId} />
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Save</Mark> to apply the final attribute mapping
                configuration
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            Assign Users and Groups
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                Navigate to your NetBird enterprise application and click on{" "}
                <Mark>Users and groups</Mark> in the left menu
              </p>
              <Lightbox image={entraAssignUsers} />
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                Click <Mark>+ Add user/group</Mark> and select the users and
                groups you want to synchronize to NetBird
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Click <Mark>Assign</Mark> to save the assignments
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            Start provisioning
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                After assigning users and groups, navigate back to the
                provisioning configuration and click the{" "}
                <Mark>Start provisioning</Mark> button to enable automatic
                synchronization
              </p>
              <Lightbox image={entraStartProvisioning} />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                The first sync will begin shortly after provisioning is started.{" "}
                <br />
                Click <Mark>Finish Setup</Mark> below to finalize this setup.
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
            Continue
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
            Back
          </Button>
        )}
        {step >= 0 && step < maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={!entraConnection && isAuth0()}
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
            onClick={finishSetup}
            disabled={integrationId === "" || authToken === ""}
          >
            Finish Setup
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
            Estimated setup time:
            <span className={"font-medium"}> 10-20 Minutes</span>
          </div>
        </div>
      )}
    </ModalContent>
  );
}
