import { IconCircleFilled } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
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
    <div className={""}>
      <div
        onClick={() => router.push("/integrations?tab=identity-provider")}
        className={cn(
          "border cursor-pointer border-nb-gray-900/50 bg-nb-gray-900/30 hover:bg-nb-gray-900/50 py-3 pl-3 pr-5 rounded-lg transition-all min-w-[310px] max-w-[440px]",
        )}
      >
        <div className={"inline-flex gap-4 w-full"}>
          <div
            className={
              "h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
            }
          >
            {enabled && idpLogo && (
              <Image
                src={idpLogo as StaticImageData}
                alt={"Identity Provider"}
                className={"rounded-[4px]"}
              />
            )}

            {!enabled && !idpLogo && <FingerprintIcon size={16} />}
          </div>
          <div className={""}>
            <div className={"flex items-center gap-3 justify-between"}>
              <div className={"font-medium text-sm flex gap-2 items-center"}>
                Identity Provider Sync
              </div>
              <div
                className={cn(
                  "text-xs flex gap-2 items-center mb-2 font-medium",
                  enabled ? "text-green-500" : "text-nb-gray-500",
                )}
              >
                <IconCircleFilled size={8} />
                {enabled ? "Enabled" : "Disabled"}
              </div>
            </div>

            <p className={"text-xs font-light !text-nb-gray-300 "}>
              Sync users and groups from Okta, Microsoft or Google IdP
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
