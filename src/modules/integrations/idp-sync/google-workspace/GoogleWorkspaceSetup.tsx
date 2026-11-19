import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { JSONFileUpload } from "@components/JSONFileUpload";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Steps from "@components/Steps";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { Lightbox } from "@components/ui/Lightbox";
import { Mark } from "@components/ui/Mark";
import { MinimalList } from "@components/ui/MinimalList";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isEmpty, trim } from "lodash";
import {
  Box,
  Clock4,
  Folder,
  FolderCog2,
  FolderGit2,
  KeyRound,
  Mail,
  MailPlus,
  PlusCircle,
  Repeat,
  Settings2,
  Shield,
  UserCircle,
} from "lucide-react";
import React, { useState } from "react";
import { useEmbeddedIdentityProviders } from "@/hooks/useEmbeddedIdentityProviders";
import { useSWRConfig } from "swr";
import integrationImage from "@/assets/integrations/google-workspace.png";
import { useTranslations } from "@/i18n/LocaleProvider";
import { GoogleWorkspaceIntegration } from "@/interfaces/IdentityProvider";
import googleAssignServiceAccount from "@/modules/integrations/idp-sync/google-workspace/images/google-assign-service-account.png";
import googleEditServiceAccount from "@/modules/integrations/idp-sync/google-workspace/images/google-edit-service-account.png";
import googlePrivilegesReview from "@/modules/integrations/idp-sync/google-workspace/images/google-privileges-review.png";
import { EmbeddedIdentityProviderSelect } from "@/modules/integrations/idp-sync/EmbeddedIdentityProviderSelect";
import { GroupPrefixHelpText } from "@/modules/integrations/idp-sync/GroupPrefixHelpText";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { GroupPrefixInput } from "../GroupPrefixInput";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export default function GoogleWorkspaceSetup({
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        <SetupContent
          onSuccess={() => {
            onOpenChange(false);
            onSuccess && onSuccess();
          }}
        />
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
};

export function SetupContent({ onSuccess }: ModalProps) {
  const translate = useTranslations();
  const { mutate } = useSWRConfig();
  const googleRequest = useApiCall<GoogleWorkspaceIntegration>(
    "/integrations/google-idp",
  );

  const { isEmbeddedIdPEnabled } = useEmbeddedIdentityProviders();
  const [step, setStep] = useState(isEmbeddedIdPEnabled ? -1 : 0);
  const maxSteps = 10;

  const [serviceAccountKey, setServiceAccountKey] = useState("");
  const [customerID, setCustomerID] = useState("");
  const [serviceAccountMail, setServiceAccountMail] = useState("");

  const clientSecretEntered = !isEmpty(serviceAccountKey);
  const customerIDEntered = !isEmpty(customerID);
  const serviceAccountMailEntered = !isEmpty(serviceAccountMail);

  const allEntered =
    clientSecretEntered && customerIDEntered && serviceAccountMailEntered;

  const isDisabled =
    (step == 3 && !serviceAccountMailEntered) ||
    (step == 4 && !clientSecretEntered) ||
    (step == 8 && !customerIDEntered);

  const [connectorId, setConnectorId] = useState("");
  const [groupPrefixes, setGroupPrefixes] = useState<string[]>([]);
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>([]);

  const connect = async () => {
    notify({
      title: translate("integrations.idpIntegrationTitle", {
        name: translate("integrations.idpGoogleWorkspace"),
      }),
      description: translate("integrations.idpConnectedDescription", {
        name: translate("integrations.idpGoogleWorkspace"),
      }),
      promise: googleRequest
        .post({
          service_account_key: btoa(serviceAccountKey), // Encode client secret to base64
          customer_id: customerID,
          group_prefixes: groupPrefixes
            ? groupPrefixes.filter((prefix) => trim(prefix) !== "")
            : [],
          user_group_prefixes: userGroupPrefixes
            ? userGroupPrefixes.filter((prefix) => trim(prefix) !== "")
            : [],
          ...(connectorId ? { connector_id: connectorId } : {}),
        })
        .then(() => {
          mutate("/integrations/google-idp");
          onSuccess();
        }),
      loadingMessage: translate("integrations.idpSettingUpLoading"),
    });
  };

  return (
    <ModalContent
      maxWidthClass={cn(
        "relative",
        step == 0 ? "max-w-[540px]" : "max-w-xl",
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
          name: translate("integrations.idpGoogleWorkspace"),
        })}
        description={translate("integrations.idpConnectDescription", {
          name: translate("integrations.idpGoogleWorkspace"),
        })}
      />

      {step === -1 && (
        <EmbeddedIdentityProviderSelect
          value={connectorId}
          onChange={setConnectorId}
          location="setup"
          filterByType={["google"]}
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
                  {translate("integrations.idpGoogleUserAccount")}
                </span>
              ),
              requirement: () => (
                <span className={"text-nb-gray-100 font-semibold"}>
                  {translate("integrations.idpPermissionsWord")}
                </span>
              ),
              followup: translate("integrations.idpWorkspaceAdminMissing"),
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
              {translate("integrations.idpGoogleCreateApps")}
            </div>
            <div
              className={
                "py-2 px-6 flex items-center gap-2 rounded-md w-full justify-center bg-nb-gray-930/0 text-nb-gray-200"
              }
            >
              <Settings2 size={14} className={"text-sky-500"} />
              {translate("integrations.idpGoogleManageApps")}
            </div>
          </div>
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Folder size={20} />
            {translate("integrations.idpGoogleCreateProject")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpGoogleCreateProjectHelp", {
                  name: () => <Mark copy>NetBird</Mark>,
                  console: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={"https://console.cloud.google.com/"}
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleEnableAdminSdk", {
                  api: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={
                        "https://console.cloud.google.com/apis/library/admin.googleapis.com"
                      }
                    >
                      {chunks}
                    </InlineLink>
                  ),
                  project: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={20} />
            {translate("integrations.idpGoogleCreateServiceAccount")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpGoogleOpenCredentials", {
                  link: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={"https://console.cloud.google.com/apis/credentials"}
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleCreateCredentials", {
                  create: (chunks) => <Mark>{chunks}</Mark>,
                  account: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleFillAndDone", {
                  done: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>

          <MinimalList
            data={[
              {
                label: translate("integrations.idpServiceAccountName"),
                value: "NetBird",
              },
              {
                label: translate("integrations.idpServiceAccountId"),
                value: "netbird",
              },
            ]}
          />
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Mail size={20} />
            {translate("integrations.idpGoogleServiceAccountEmail")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpGoogleOpenServiceAccounts", {
                  link: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={
                        "https://console.cloud.google.com/iam-admin/serviceaccounts"
                      }
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleCopyServiceEmail", {
                  name: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <Lightbox image={googleEditServiceAccount} />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate("integrations.idpGoogleEnterEmail")}
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <Mail size={16} className={"text-nb-gray-300"} />
                </div>
              }
              placeholder={"netbird@loadtests-347817.iam.gserviceaccount.com"}
              value={serviceAccountMail}
              onChange={(e) => setServiceAccountMail(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 4 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <KeyRound size={20} />
            {translate("integrations.idpGoogleServiceAccountKey")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleCreateKeyHelp", {
                  keys: (chunks) => <Mark>{chunks}</Mark>,
                  add: (chunks) => <Mark>{chunks}</Mark>,
                  create: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleSelectJson", {
                  select: () => <>{translate("common.select") + " "}</>,
                  json: (chunks) => <Mark>{chunks}</Mark>,
                  create: () => <Mark>{translate("common.create")}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={4} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleKeyHelp", {
                  here: (chunks) => (
                    <InlineLink
                      href={
                        "https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys#temp-locations"
                      }
                      target={"_blank"}
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4 z-0 relative"}>
            <JSONFileUpload
              value={serviceAccountKey}
              onChange={setServiceAccountKey}
            />
            {serviceAccountKey && (
              <div className={"mt-3"}>
                <Input
                  type={"text"}
                  className={"w-full"}
                  customPrefix={
                    <div className={"flex items-center gap-2"}>
                      <KeyRound size={16} className={"text-nb-gray-300"} />
                    </div>
                  }
                  placeholder={"YdV7Q~JJ62Xl.LvYoBanxZR2sJA2va_3UbqvncY8"}
                  value={btoa(serviceAccountKey)}
                  readOnly={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {step == 5 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderCog2 size={20} />
            {translate("integrations.idpGoogleCreateAdminRole")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p>
                {translate.rich("integrations.idpGoogleOpenAdminConsole", {
                  link: (chunks) => (
                    <InlineLink
                      className={"inline"}
                      target={"_blank"}
                      href={"https://admin.google.com/ac/home"}
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleOpenAdminRoles", {
                  select: () => <>{translate("common.select") + " "}</>,
                  account: () => <Mark>{translate("common.account")}</Mark>,
                  roles: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleCreateRole", {
                  create: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
          <MinimalList
            data={[
              {
                label: translate("common.name"),
                value: translate("integrations.idpGoogleReadOnlyRole"),
              },
              {
                label: translate("integrations.idpDescription"),
                value: translate("integrations.idpGoogleReadOnlyRole"),
              },
            ]}
          />
        </div>
      )}

      {step == 6 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Shield size={20} />
            {translate("integrations.idpGooglePrivileges")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleScrollPrivileges", {
                  privileges: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <MinimalList
                className={"mt-2 mb-0"}
                data={[
                  {
                    label: translate("integrations.idpGoogleUsersLabel"),
                    value: translate("integrations.idpGoogleRead"),
                  },
                  {
                    label: translate("integrations.idpGoogleGroupsLabel"),
                    value: translate("integrations.idpGoogleRead"),
                  },
                ]}
              />
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleRolePreview", {
                  role: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <Lightbox image={googlePrivilegesReview} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 7 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <MailPlus size={20} />
            {translate("integrations.idpAssignServiceAccount")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleAssignAccounts", {
                  assign: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleEnterMail", {
                  email: (chunks) => <Mark>{chunks}</Mark>,
                  add: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <MinimalList
                className={"mt-2 mb-0"}
                data={[
                  {
                    label: translate("integrations.idpGoogleEmailLabel"),
                    value: serviceAccountMail,
                  },
                ]}
              />
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleAssignRole", {
                  assign: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
              <Lightbox image={googleAssignServiceAccount} />
            </Steps.Step>
          </Steps>
        </div>
      )}

      {step == 8 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <Box size={20} />
            {translate("integrations.idpGoogleEnterCustomerId")}
          </p>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleOpenAccountSettings", {
                  link: (chunks) => (
                    <InlineLink
                      target={"_blank"}
                      className={"inline"}
                      href={
                        "https://admin.google.com/ac/accountsettings/profile?hl=en_US"
                      }
                    >
                      {chunks}
                    </InlineLink>
                  ),
                })}
              </p>
            </Steps.Step>
            <Steps.Step step={2} line={false}>
              <p className={"font-normal"}>
                {translate.rich("integrations.idpGoogleNoteCustomerId", {
                  customer: (chunks) => <Mark>{chunks}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
          <div className={"mb-4 flex flex-col gap-3"}>
            <Input
              type={"text"}
              className={"w-full"}
              customPrefix={
                <div className={"min-w-[165px] flex gap-2 items-center"}>
                  <Box size={16} />
                  {translate("integrations.idpCustomerId")}
                </div>
              }
              placeholder={"C03f4c3po"}
              value={customerID}
              onChange={(e) => setCustomerID(e.target.value)}
            />
          </div>
        </div>
      )}

      {step == 9 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={20} />
            {translate("common.groupsToSync")}
          </p>

          <div className={"mb-4 flex flex-col gap-1"}>
            <div>
              <GroupPrefixHelpText />
            </div>
            <GroupPrefixInput
              value={groupPrefixes}
              onChange={setGroupPrefixes}
            />
          </div>
        </div>
      )}

      {step == 10 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={18} />
            {translate("common.usersToSync")}
          </p>

          <div className={"mb-4 flex flex-col gap-1"}>
            <div>
              <GroupPrefixHelpText type={"user-groups"} />
            </div>

            <GroupPrefixInput
              addText={translate("integrations.idpAddUserGroupFilter")}
              text={translate("integrations.idpUserGroupStartsWith")}
              value={userGroupPrefixes}
              onChange={setUserGroupPrefixes}
            />
          </div>
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
            disabled={isDisabled}
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
            disabled={!allEntered}
            onClick={connect}
          >
            <Repeat size={16} />
            {translate("integrations.connect")}
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
