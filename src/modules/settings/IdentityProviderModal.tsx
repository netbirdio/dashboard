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
import { CopyIcon, FingerprintIcon, GlobeIcon, IdCard, KeyIcon, KeyRound, PlusCircle, SaveIcon, TagIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import {
  IdentityProvider,
  IdentityProviderRequest,
  IdentityProviderType,
} from "@/interfaces/IdentityProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  provider?: IdentityProvider | null;
};

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 221 221">
    <path fill="#F1511B" d="M104.868 104.868H0V0h104.868z"/>
    <path fill="#80CC28" d="M220.654 104.868H115.788V0h104.866z"/>
    <path fill="#00ADEF" d="M104.865 220.695H0V115.828h104.865z"/>
    <path fill="#FBBC09" d="M220.654 220.695H115.788V115.828h104.866z"/>
  </svg>
);

const EntraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18">
    <path fill="#225086" d="M3.802 14.032c.388.242 1.033.511 1.715.511.621 0 1.198-.18 1.676-.487l.002-.001L9 12.927V17a1.56 1.56 0 0 1-.824-.234z"/>
    <path fill="#6df" d="m7.853 1.507-7.5 8.46c-.579.654-.428 1.642.323 2.111l3.126 1.954c.388.242 1.033.511 1.715.511.621 0 1.198-.18 1.676-.487l.002-.001L9 12.927l-4.364-2.728 4.365-4.924V1c-.424 0-.847.169-1.147.507Z"/>
    <path fill="#cbf8ff" d="m4.636 10.199.052.032L9 12.927h.001V5.276L9 5.275z"/>
    <path fill="#074793" d="M17.324 12.078c.751-.469.902-1.457.323-2.111l-4.921-5.551a3.1 3.1 0 0 0-1.313-.291c-.925 0-1.752.399-2.302 1.026l-.109.123 4.364 4.924-4.365 2.728v4.073c.287 0 .573-.078.823-.234l7.5-4.688Z"/>
    <path fill="#0294e4" d="M9.001 1v4.275l.109-.123a3.05 3.05 0 0 1 2.302-1.026c.472 0 .916.107 1.313.291l-2.579-2.909A1.52 1.52 0 0 0 9 1.001Z"/>
    <path fill="#96bcc2" d="M13.365 10.199 9.001 5.276v7.65z"/>
  </svg>
);

const OktaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
    <path fill="currentColor" fillRule="evenodd" d="m19.8.26-.74 9.12c-.35-.04-.7-.06-1.06-.06-.45 0-.89.03-1.32.1L16.26 5c-.01-.14.1-.26.24-.26h.75L16.89.27c-.01-.14.1-.26.23-.26h2.45c.14 0 .25.12.23.26zm-6.18.45c-.04-.13-.18-.21-.31-.16l-2.3.84c-.13.05-.19.2-.13.32l1.87 4.08-.71.26c-.13.05-.19.2-.13.32l1.91 4.01c.69-.38 1.44-.67 2.23-.85L13.63.71zM7.98 3.25l5.29 7.46c-.67.44-1.28.96-1.8 1.56L8.3 9.15c-.1-.1-.09-.26.01-.35l.58-.48-3.15-3.19c-.1-.1-.09-.26.02-.35l1.87-1.57c.11-.09.26-.07.34.04zM3.54 7.57c-.11-.08-.27-.04-.34.08L1.98 9.77c-.07.12-.02.27.1.33l4.06 1.92-.38.65a.23.23 0 0 0 .11.33l4.04 1.85c.29-.75.68-1.45 1.16-2.08zM.55 13.33c.02-.14.16-.22.29-.19l8.85 2.31c-.23.75-.36 1.54-.38 2.36l-4.43-.36a.23.23 0 0 1-.21-.28l.13-.74-4.47-.42c-.14-.01-.23-.14-.21-.28l.42-2.41zm-.33 5.98c-.14.01-.23.14-.21.28L.44 22c.02.14.16.22.29.19l4.34-1.13.13.74c.02.14.16.22.29.19l4.28-1.18c-.25-.74-.41-1.53-.45-2.34l-9.11.84zm1.42 6.34a.236.236 0 0 1 .1-.33L10 21.4c.31.74.73 1.43 1.23 2.05l-3.62 2.58c-.11.08-.27.05-.34-.07l-.38-.66-3.69 2.55c-.11.08-.27.04-.34-.08l-1.23-2.12zm10.01-1.72-6.43 6.51c-.1.1-.09.26.02.35l1.88 1.57c.11.09.26.07.34-.04l2.6-3.66.58.49c.11.09.27.07.35-.05l2.52-3.66c-.68-.42-1.31-.93-1.85-1.51zm-1.27 10.45a.234.234 0 0 1-.13-.32l3.81-8.32c.7.36 1.46.63 2.25.78l-1.12 4.3c-.03.13-.18.21-.31.16l-.71-.26-1.19 4.33c-.04.13-.18.21-.31.16l-2.3-.84zm6.56-7.75-.74 9.12c-.01.14.1.26.23.26h2.45c.14 0 .25-.12.23-.26l-.36-4.47h.75c.14 0 .25-.12.24-.26l-.42-4.42c-.43.07-.87.1-1.32.1-.36 0-.71-.02-1.06-.07m8.82-24.69c.06-.13 0-.27-.13-.32l-2.3-.84c-.13-.05-.27.03-.31.16l-1.19 4.33-.71-.26c-.13-.05-.27.03-.31.16l-1.12 4.3c.8.16 1.55.43 2.25.78zm5.02 3.63-6.43 6.51a8.7 8.7 0 0 0-1.85-1.51l2.52-3.66c.08-.11.24-.14.35-.05l.58.49 2.6-3.66c.08-.11.24-.13.34-.04l1.88 1.57c.11.09.11.25.02.35zm3.48 5.12c.13-.06.17-.21.1-.33l-1.23-2.12a.246.246 0 0 0-.34-.08l-3.69 2.55-.38-.65c-.07-.12-.23-.16-.34-.07l-3.62 2.58c.5.62.91 1.31 1.23 2.05l8.26-3.92zm1.3 3.32.42 2.41c.02.14-.07.26-.21.28l-9.11.85c-.04-.82-.2-1.6-.45-2.34l4.28-1.18c.13-.04.27.05.29.19l.13.74 4.34-1.13c.13-.03.27.05.29.19zm-.41 8.85c.13.03.27-.05.29-.19l.42-2.41a.24.24 0 0 0-.21-.28l-4.47-.42.13-.74a.24.24 0 0 0-.21-.28l-4.43-.36c-.02.82-.15 1.61-.38 2.36l8.85 2.31zm-2.36 5.5c-.07.12-.23.15-.34.08l-7.53-5.2c.48-.63.87-1.33 1.16-2.08l4.04 1.85c.13.06.18.21.11.33l-.38.65 4.06 1.92c.12.06.17.21.1.33zm-10.07-3.07 5.29 7.46c.08.11.24.13.34.04l1.87-1.57c.11-.09.11-.25.02-.35l-3.15-3.19.58-.48c.11-.09.11-.25.01-.35l-3.17-3.12c-.53.6-1.13 1.13-1.8 1.56zm-.05 10.16c-.13.05-.27-.03-.31-.16l-2.42-8.82c.79-.18 1.54-.47 2.23-.85l1.91 4.01c.06.13 0 .28-.13.32l-.71.26 1.87 4.08c.06.13 0 .27-.13.32l-2.3.84z" clipRule="evenodd"/>
  </svg>
);

const PocketIdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 512 512">
    <circle cx="256" cy="256" r="256" fill="#fff"/>
    <path d="M268.6 102.4c64.4 0 116.8 52.4 116.8 116.7 0 25.3-8 49.4-23 69.6-14.8 19.9-35 34.3-58.4 41.7l-6.5 2-15.5-76.2 4.3-2c14-6.7 23-21.1 23-36.6 0-22.4-18.2-40.6-40.6-40.6S228 195.2 228 217.6c0 15.5 9 29.8 23 36.6l4.2 2-25 153.4h-69.5V102.4z" fill="#191919"/>
  </svg>
);

const ZitadelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 80 79" fill="none">
    <defs>
      <linearGradient id="zitadel-modal-grad" x1="3.86" x2="76.88" y1="47.89" y2="47.89" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF8F00"/>
        <stop offset="1" stopColor="#FE00FF"/>
      </linearGradient>
    </defs>
    <path fill="url(#zitadel-modal-grad)" fillRule="evenodd" d="M17.12 39.17l1.42 5.32-6.68 6.68 9.12 2.44 1.43 5.32-19.77-5.3L17.12 39.17zM58.82 22.41l-5.32-1.43-2.44-9.12-6.68 6.68-5.32-1.43 14.47-14.47 5.3 19.77zM52.65 67.11l3.89-3.89 9.12 2.44-2.44-9.12 3.9-3.9 5.29 19.77-19.76-5.3zM36.43 69.54l-1.18-12.07 8.23 2.21-7.05 9.86zM23 23.84l5.02 11.04 6.02-6.02L23 23.84zM69.32 36.2l-12.07-1.18 2.2 8.23 9.87-7.05z" clipRule="evenodd"/>
  </svg>
);

const idpIcons: Record<IdentityProviderType, React.ReactNode> = {
  google: <GoogleIcon />,
  microsoft: <MicrosoftIcon />,
  entra: <EntraIcon />,
  okta: <OktaIcon />,
  pocketid: <PocketIdIcon />,
  zitadel: <ZitadelIcon />,
  oidc: <KeyRound size={16} className="text-nb-gray-400" />,
};

const idpTypes: { value: IdentityProviderType; label: string }[] = [
  { value: "oidc", label: "OIDC (Generic)" },
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft" },
  { value: "entra", label: "Microsoft Entra" },
  { value: "okta", label: "Okta" },
  { value: "zitadel", label: "Zitadel" },
  { value: "pocketid", label: "PocketID" },
];

const copyMessage = "Redirect URL was copied to your clipboard!";

export default function IdentityProviderModal({
  open,
  onClose,
  provider,
}: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const isEditing = !!provider;

  const createRequest = useApiCall<IdentityProvider>("/identity-providers");
  const updateRequest = useApiCall<IdentityProvider>(
    "/identity-providers/" + provider?.id,
  );

  const [type, setType] = useState<IdentityProviderType>(provider?.type ?? "oidc");
  const [name, setName] = useState(provider?.name ?? "");
  const [issuer, setIssuer] = useState(provider?.issuer ?? "");
  const [clientId, setClientId] = useState(provider?.client_id ?? "");
  const [clientSecret, setClientSecret] = useState("");

  const [successModal, setSuccessModal] = useState(false);
  const [createdProvider, setCreatedProvider] = useState<IdentityProvider>();
  const [, copyToClipboard] = useCopyToClipboard(createdProvider?.redirect_url);

  useEffect(() => {
    if (provider) {
      setType(provider.type);
      setName(provider.name);
      setIssuer(provider.issuer);
      setClientId(provider.client_id);
      setClientSecret("");
    } else {
      setType("oidc");
      setName("");
      setIssuer("");
      setClientId("");
      setClientSecret("");
    }
  }, [provider, open]);

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
    const payload: IdentityProviderRequest = {
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
      <Modal open={open} onOpenChange={(state) => !state && onClose()} key={open ? 1 : 0}>
        <ModalContent maxWidthClass={"max-w-xl"}>
          <ModalHeader
            icon={<FingerprintIcon size={20} />}
            title={isEditing ? "Edit Identity Provider" : "Add Identity Provider"}
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
              <Select value={type} onValueChange={(v) => setType(v as IdentityProviderType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider type..." />
                </SelectTrigger>
                <SelectContent>
                  {idpTypes.map((idp) => (
                    <SelectItem key={idp.value} value={idp.value}>
                      <div className="flex items-center gap-2">
                        {idpIcons[idp.value]}
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
                customPrefix={<TagIcon size={16} className="text-nb-gray-300" />}
              />
            </div>

            {requiresIssuer && (
              <div>
                <Label>Issuer URL</Label>
                <HelpText>The OIDC issuer URL for this provider</HelpText>
                <Input
                  placeholder={"e.g., https://login.example.com"}
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  customPrefix={<GlobeIcon size={16} className="text-nb-gray-300" />}
                />
              </div>
            )}

            <div>
              <Label>Client ID</Label>
              <HelpText>The OAuth2 client ID</HelpText>
              <Input
                placeholder={"e.g., 123456789.apps.googleusercontent.com"}
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
                customPrefix={<KeyIcon size={16} className="text-nb-gray-300" />}
              />
            </div>

            {isEditing && provider?.redirect_url && (
              <div>
                <Label>Redirect URL</Label>
                <HelpText>Configure this URL in your identity provider</HelpText>
                <Code
                  codeToCopy={provider.redirect_url}
                  message={copyMessage}
                >
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

              <Button variant={"primary"} onClick={submit} disabled={isDisabled}>
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
          maxWidthClass={"max-w-md"}
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