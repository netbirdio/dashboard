import Button from "@components/Button";
import Code from "@components/Code";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import Separator from "@components/Separator";
import { useApiCall } from "@utils/api";
import { trim } from "lodash";
import {
  CopyIcon,
  FingerprintIcon,
  GlobeIcon,
  IdCard,
  KeyIcon,
  PlusCircle,
  SaveIcon,
  TagIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { usePermissions } from "@/contexts/PermissionsProvider";
import {
  SSOIdentityProvider,
  SSOIdentityProviderOptions,
  SSOIdentityProviderRequest,
  SSOIdentityProviderType,
} from "@/interfaces/IdentityProvider";
import { idpIcon } from "@/assets/icons/IdentityProviderIcons";

const issuerHints: Partial<Record<SSOIdentityProviderType, string>> = {
  keycloak: "https://keycloak.example.com/realms/{REALM}",
  authentik: "https://authentik.example.com/application/o/{APP_SLUG}/",
  zitadel: "https://{INSTANCE}.zitadel.cloud",
  okta: "https://{ORG}.okta.com",
  entra: "https://login.microsoftonline.com/{TENANT_ID}/v2.0",
  pocketid: "https://pocketid.example.com",
};

const defaultNames: Record<SSOIdentityProviderType, string> = {
  oidc: "Generic OIDC",
  google: "Google",
  microsoft: "Microsoft",
  entra: "Microsoft Entra",
  okta: "Okta",
  zitadel: "Zitadel",
  pocketid: "PocketID",
  authentik: "Authentik",
  keycloak: "Keycloak",
};

type Props = {
  open: boolean;
  onClose: () => void;
  provider?: SSOIdentityProvider | null;
};

const copyMessage = "Redirect URL was copied to your clipboard!";

export default function IdentityProviderModal({
  open,
  onClose,
  provider,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const isEditing = !!provider;

  const createRequest = useApiCall<SSOIdentityProvider>("/identity-providers");
  const updateRequest = useApiCall<SSOIdentityProvider>(
    "/identity-providers/" + provider?.id,
  );

  const [type, setType] = useState<SSOIdentityProviderType>(
    provider?.type ?? "oidc",
  );
  const [name, setName] = useState(provider?.name ?? "");
  const [issuer, setIssuer] = useState(provider?.issuer ?? "");
  const [clientId, setClientId] = useState(provider?.client_id ?? "");
  const [clientSecret, setClientSecret] = useState("");

  const [successModal, setSuccessModal] = useState(false);
  const [createdProvider, setCreatedProvider] = useState<SSOIdentityProvider>();
  const [, copyToClipboard] = useCopyToClipboard(createdProvider?.redirect_url);

  const requiresIssuer = type !== "google" && type !== "microsoft";

  const isDisabled = useMemo(() => {
    const trimmedName = trim(name);
    const trimmedIssuer = trim(issuer);
    const trimmedClientId = trim(clientId);
    const trimmedClientSecret = trim(clientSecret);

    if (trimmedName.length === 0) return true;
    if (requiresIssuer && trimmedIssuer.length === 0) return true;
    if (trimmedClientId.length === 0) return true;
    if (!isEditing && trimmedClientSecret.length === 0) return true;

    return false;
  }, [name, issuer, clientId, clientSecret, isEditing, requiresIssuer]);

  const handleCopyAndClose = () => {
    copyToClipboard(copyMessage).then(() => {
      setSuccessModal(false);
      onClose();
    });
  };

  const submit = () => {
    const payload: SSOIdentityProviderRequest = {
      type,
      name: trim(name),
      issuer: trim(issuer),
      client_id: trim(clientId),
      client_secret: trim(clientSecret),
    };

    if (isEditing) {
      notify({
        title: "Update Identity Provider",
        description: "Identity provider was updated successfully.",
        promise: updateRequest.put(payload).then(() => {
          mutate("/identity-providers");
          onClose();
        }),
        loadingMessage: "Updating identity provider...",
      });
    } else {
      notify({
        title: "Create Identity Provider",
        description: "Identity provider was created successfully.",
        promise: createRequest.post(payload).then((idp) => {
          mutate("/identity-providers");
          if (idp.redirect_url) {
            setCreatedProvider(idp);
            setSuccessModal(true);
          } else {
            onClose();
          }
        }),
        loadingMessage: "Creating identity provider...",
      });
    }
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(state) => !state && onClose()}
        key={open ? 1 : 0}
      >
        <ModalContent maxWidthClass={"max-w-xl"}>
          <ModalHeader
            icon={<FingerprintIcon size={20} />}
            title={
              isEditing ? "Edit Identity Provider" : "Add Identity Provider"
            }
            description={
              isEditing
                ? "Update the identity provider configuration"
                : "Configure a new identity provider for authentication"
            }
            color={"netbird"}
          />

          <Separator />

          <div className={"px-8 py-6 flex flex-col gap-6"}>
            <div>
              <Label>Provider Type</Label>
              <HelpText>Select the type of identity provider</HelpText>
              <Select
                value={type}
                onValueChange={(v) => {
                  const newType = v as SSOIdentityProviderType;
                  setType(newType);
                  if (!isEditing) {
                    setName(defaultNames[newType]);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider type..." />
                </SelectTrigger>
                <SelectContent>
                  {SSOIdentityProviderOptions.map((idp) => (
                    <SelectItem key={idp.value} value={idp.value}>
                      <div className="flex items-center gap-2">
                        {idpIcon(idp.value)}
                        <span>{idp.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Name</Label>
              <HelpText>A friendly name to identify this provider</HelpText>
              <Input
                placeholder={"e.g., Corporate SSO"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                customPrefix={
                  <TagIcon size={16} className="text-nb-gray-300" />
                }
              />
            </div>

            {requiresIssuer && (
              <div>
                <Label>Issuer URL</Label>
                <HelpText>The OIDC issuer URL for this provider</HelpText>
                <Input
                  placeholder={issuerHints[type] ?? "https://login.example.com"}
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  customPrefix={
                    <GlobeIcon size={16} className="text-nb-gray-300" />
                  }
                />
              </div>
            )}

            <div>
              <Label>Client ID</Label>
              <HelpText>The OAuth2 confidential client ID</HelpText>
              <Input
                placeholder={"Enter client ID"}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                customPrefix={<IdCard size={16} className="text-nb-gray-300" />}
              />
            </div>

            <div>
              <Label>Client Secret</Label>
              <HelpText>
                {isEditing
                  ? "Leave empty to keep the existing secret, or enter a new one"
                  : "The OAuth2 client secret"}
              </HelpText>
              <Input
                type="password"
                placeholder={isEditing ? "••••••••" : "Enter client secret"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                customPrefix={
                  <KeyIcon size={16} className="text-nb-gray-300" />
                }
              />
            </div>

            {isEditing && provider?.redirect_url && (
              <div>
                <Label>Redirect URL</Label>
                <HelpText>
                  Configure this URL in your identity provider
                </HelpText>
                <Code codeToCopy={provider.redirect_url} message={copyMessage}>
                  <Code.Line>{provider.redirect_url}</Code.Line>
                </Code>
              </div>
            )}
          </div>

          <ModalFooter className={"items-center"}>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>

              <Button
                variant={"primary"}
                onClick={submit}
                disabled={
                  isDisabled ||
                  (isEditing
                    ? !permission.identity_providers.update
                    : !permission.identity_providers.create)
                }
              >
                {isEditing ? (
                  <>
                    <SaveIcon size={16} />
                    Save Changes
                  </>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    Add Provider
                  </>
                )}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        open={successModal}
        onOpenChange={(open) => {
          setSuccessModal(open);
          if (!open) onClose();
        }}
      >
        <ModalContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          maxWidthClass={"max-w-xl"}
          className={"mt-20"}
          showClose={false}
        >
          <div className={"pb-6 px-8"}>
            <div className={"flex flex-col items-center justify-center gap-3"}>
              <div>
                <h2 className={"text-2xl text-center mb-2"}>
                  Identity Provider Created
                </h2>
                <Paragraph className={"mt-0 text-sm text-center"}>
                  Configure the following redirect URL in your identity provider
                  settings.
                </Paragraph>
              </div>
            </div>
          </div>

          <div className={"px-8 pb-6"}>
            <Code message={copyMessage}>
              <Code.Line>{createdProvider?.redirect_url || ""}</Code.Line>
            </Code>
          </div>
          <ModalFooter className={"items-center"}>
            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={handleCopyAndClose}
            >
              <CopyIcon size={14} />
              Copy & Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
