import Button from "@components/Button";
import { Callout } from "@components/Callout";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { MinimalList } from "@components/ui/MinimalList";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { isAuth0 } from "@utils/netbird";
import { isEmpty, trim } from "lodash";
import {
  BoxIcon,
  ExternalLinkIcon,
  FolderGit2,
  UserCircle,
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
import { GenericSCIMProps } from "@/modules/integrations/idp-sync/generic-scim/GenericSCIM";
import { EmbeddedIdentityProviderSelect } from "@/modules/integrations/idp-sync/EmbeddedIdentityProviderSelect";
import { GroupPrefixHelpText } from "@/modules/integrations/idp-sync/GroupPrefixHelpText";
import { GroupPrefixInput } from "@/modules/integrations/idp-sync/GroupPrefixInput";
import { IntegrationModalHeader } from "@/modules/integrations/IntegrationModalHeader";
import { useSSOConnections } from "@/modules/integrations/sso/useSSOConnections";

interface Props extends GenericSCIMProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function GenericSCIMSetup({
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

const maxWidthClasses = ["max-w-lg", "max-w-xl", "max-w-xl", "max-w-xl"];

export function SetupContent({
  onSuccess,
  name,
  image,
  onClose,
  provider,
}: ModalProps) {
  const t = useTranslations();
  const { isEmbeddedIdPEnabled } = useEmbeddedIdentityProviders();
  const [step, setStep] = useState(isEmbeddedIdPEnabled ? -1 : 0);
  const [authToken, setAuthToken] = useState("");
  const { mutate } = useSWRConfig();
  const [connectorId, setConnectorId] = useState("");
  const [groupPrefixes, setGroupPrefixes] = useState<string[]>([]);
  const [userGroupPrefixes, setUserGroupPrefixes] = useState<string[]>([]);
  const maxSteps = 3;
  const [integrationId, setIntegrationId] = useState("");
  const { genericConnection, isSSOLoading } = useSSOConnections();
  const scimProvider = provider ?? IdentityProvider.GENERIC;

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
      title: t("integrations.idpIntegrationTitle", { name: name ?? "" }),
      description: t("integrations.idpSetUpDescription", { name: name ?? "" }),
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
      loadingMessage: t("integrations.idpSettingUpLoading"),
    });
  };

  useEffect(() => {
    const getAuthToken = async () => {
      if (!genericConnection && isAuth0()) return;
      const integrationList = await integrations.get();
      const genericIntegration = integrationList?.find(
        (item) => item.provider === scimProvider,
      );

      if (!isEmpty(genericIntegration)) {
        const id = genericIntegration.id;
        if (authToken != "") return authToken;
        const res = await integrationRequest.post({}, `/${id}/token`);
        if (!res) return "";
        setIntegrationId(id);
        return res.auth_token;
      } else {
        const res = await integrationRequest.post({
          prefix: isAuth0()
            ? `${genericConnection?.strategy}|${genericConnection?.name}`
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

    if (step === 3 && authToken === "") {
      getAuthToken().then((token) => {
        if (token !== undefined && token !== "") setAuthToken(token);
      });
    }
  }, [step, authToken, genericConnection, groupPrefixes, userGroupPrefixes]);

  return (
    <ModalContent
      maxWidthClass={cn("relative", step === -1 ? "max-w-lg" : maxWidthClasses[step])}
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
        title={t("integrations.idpConnectTitle", { name: name ?? "" })}
        description={t("integrations.idpConnectDescription", {
          name: name ?? "",
        })}
      />

      {step === -1 && (
        <EmbeddedIdentityProviderSelect
          value={connectorId}
          onChange={setConnectorId}
          location="setup"
        />
      )}

      {step == 0 && (
        <div
          className={
            "px-8 py-3 flex z-0 flex-col gap-0 text-sm mb-3 text-center justify-center items-center"
          }
        >
          <p className={"mt-2 !text-nb-gray-300"}>
            {t.rich("integrations.idpGenericScimIntro", {
              docs: (chunks) => (
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={
                    "https://docs.netbird.io/how-to/idp-sync#supported-identity-providers"
                  }
                >
                  {chunks}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              ),
            })}
          </p>

          <p className={"mt-2 !text-nb-gray-300"}>
            {t.rich("integrations.idpGenericNotListed", {
              email: (chunks) => (
                <InlineLink
                  className={"inline"}
                  target={"_blank"}
                  href={
                    "mailto:support@netbird.io?subject=Request%20for%20Assistance%3A%20Custom%20Identity%20Provider"
                  }
                >
                  {chunks}
                </InlineLink>
              ),
            })}
          </p>
          {!genericConnection && !isSSOLoading && isAuth0() && (
            <Callout className={"max-w-xl mt-5 text-left"} variant={"warning"}>
              <span>
                {t.rich("integrations.idpGenericSsoRequired", {
                  docs: (chunks) => (
                    <InlineLink
                      href={"https://docs.netbird.io/how-to/single-sign-on"}
                      target={"_blank"}
                    >
                      {chunks}
                      <ExternalLinkIcon size={12} />
                    </InlineLink>
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
            <FolderGit2 size={20} />
            {t("common.groupsToSync")}
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

      {step == 2 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <UserCircle size={18} />
            {t("common.usersToSync")}
          </p>

          <div className={"mb-4 flex flex-col gap-1"}>
            <div>
              <GroupPrefixHelpText type={"user-groups"} />
            </div>

            <GroupPrefixInput
              addText={t("integrations.idpAddUserGroupFilter")}
              text={t("integrations.idpUserGroupStartsWith")}
              value={userGroupPrefixes}
              onChange={setUserGroupPrefixes}
            />
          </div>
        </div>
      )}

      {step == 3 && (
        <div className={"px-8 py-3 flex flex-col gap-2 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <BoxIcon size={20} />
            {t("integrations.idpScimCredentials")}
          </p>
          <MinimalList
            data={[
              {
                label: t("common.name"),
                value: "NetBird",
              },
              {
                label: t("integrations.idpApiType"),
                value: "SCIM API",
                noCopy: true,
              },
              {
                label: t("integrations.idpScimVersion"),
                value: "SCIM 2.0",
                noCopy: true,
              },
              {
                label: t("integrations.idpBaseUrl"),
                value: "https://api.netbird.io/api/scim/v2",
              },
              {
                label: t("integrations.idpToken"),
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
            {t("common.continue")}
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
            {t("common.back")}
          </Button>
        )}
        {step >= 0 && step < maxSteps && (
          <Button
            variant={"primary"}
            className={"w-full"}
            disabled={!genericConnection && isAuth0()}
            onClick={() => setStep(step + 1)}
          >
            {step == 0 ? t("integrations.idpGetStarted") : t("common.continue")}
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
            {t("common.finishSetup")}
          </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
}
