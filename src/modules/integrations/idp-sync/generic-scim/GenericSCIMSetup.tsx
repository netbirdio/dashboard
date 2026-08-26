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
        title={`Connect NetBird with ${name}`}
        description={`Start syncing your users and groups from ${name} to NetBird. Follow the steps below to get started.`}
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
            SCIM configuration varies by identity provider. Please refer to our{" "}
            <InlineLink
              className={"inline"}
              target={"_blank"}
              href={
                "https://docs.netbird.io/how-to/idp-sync#supported-identity-providers"
              }
            >
              IdP Documentation
              <ExternalLinkIcon size={12} />
            </InlineLink>{" "}
            for provider-specific setup guides.
          </p>

          <p className={"mt-2 !text-nb-gray-300"}>
            If your identity provider is not listed in our documentation contact
            us at{" "}
            <InlineLink
              className={"inline"}
              target={"_blank"}
              href={
                "mailto:support@netbird.io?subject=Request%20for%20Assistance%3A%20Custom%20Identity%20Provider"
              }
            >
              support@netbird.io
            </InlineLink>
          </p>
          {!genericConnection && !isSSOLoading && isAuth0() && (
            <Callout className={"max-w-xl mt-5 text-left"} variant={"warning"}>
              <span>
                Single-Sign-On needs to be enabled and active before you can
                enable IdP sync.{" "}
                <InlineLink
                  href={"https://docs.netbird.io/how-to/single-sign-on"}
                  target={"_blank"}
                >
                  How to enable SSO
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </span>
            </Callout>
          )}
        </div>
      )}

      {step == 1 && (
        <div className={"px-8 py-3 flex flex-col gap-0 mt-4"}>
          <p className={"font-medium flex gap-3 items-center text-base"}>
            <FolderGit2 size={20} />
            Groups to be synchronized
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
            Users to be synchronized
          </p>

          <div className={"mb-4 flex flex-col gap-1"}>
            <div>
              <GroupPrefixHelpText type={"user-groups"} />
            </div>

            <GroupPrefixInput
              addText={"Add user group filter"}
              text={"User group starts with..."}
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
            SCIM Credentials
          </p>
          <MinimalList
            data={[
              {
                label: "Name",
                value: "NetBird",
              },
              {
                label: "API Type",
                value: "SCIM API",
                noCopy: true,
              },
              {
                label: "SCIM Version",
                value: "SCIM 2.0",
                noCopy: true,
              },
              {
                label: "Base URL",
                value: "https://api.netbird.io/api/scim/v2",
              },
              {
                label: "Token",
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
            disabled={!genericConnection && isAuth0()}
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
    </ModalContent>
  );
}
