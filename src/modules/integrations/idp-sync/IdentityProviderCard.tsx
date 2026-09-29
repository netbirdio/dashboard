import FeatureCard, { FeatureCardStatus } from "@components/FeatureCard";
import { FingerprintIcon } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import azureEntraLogo from "@/assets/integrations/entra-id.png";
import genericLogo from "@/assets/integrations/generic-scim.png";
import googleLogo from "@/assets/integrations/google-workspace.png";
import jumpcloudLogo from "@/assets/integrations/jumpcloud.png";
import oktaLogo from "@/assets/integrations/okta.png";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";

type IDP = "azure" | "google" | "okta" | "jumpcloud" | "generic" | "entraScim";
const idpImages: { [key in IDP]?: StaticImageData } = {
  azure: azureEntraLogo,
  google: googleLogo,
  okta: oktaLogo,
  jumpcloud: jumpcloudLogo,
  generic: genericLogo,
  entraScim: azureEntraLogo,
};

export const IdentityProviderCard = () => {
  const {
    isAnyIntegrationEnabled,
    isAzureEnabled,
    isGoogleEnabled,
    isOktaEnabled,
    isJumpcloudEnabled,
    isGenericEnabled,
    isEntraEnabled,
  } = useIntegrations();
  const enabled = !!isAnyIntegrationEnabled;
  const router = useRouter();

  const idpLogo = useMemo(() => {
    if (isAzureEnabled) return idpImages.azure;
    if (isEntraEnabled) return idpImages.entraScim;
    if (isGoogleEnabled) return idpImages.google;
    if (isOktaEnabled) return idpImages.okta;
    if (isJumpcloudEnabled) return idpImages.jumpcloud;
    if (isGenericEnabled) return idpImages.generic;
    return undefined;
  }, [
    isAzureEnabled,
    isEntraEnabled,
    isGoogleEnabled,
    isJumpcloudEnabled,
    isOktaEnabled,
    isGenericEnabled,
  ]);

  return (
    <FeatureCard
      onClick={() => router.push("/integrations?tab=identity-provider")}
      icon={
        enabled && idpLogo ? (
          <Image
            src={idpLogo as StaticImageData}
            alt={"Identity Provider"}
            className={"rounded-[4px]"}
          />
        ) : (
          <FingerprintIcon size={16} />
        )
      }
      title={"Identity Provider Sync"}
      action={<FeatureCardStatus enabled={enabled} />}
      description={"Sync users and groups from Okta, Microsoft or Google IdP"}
    />
  );
};
