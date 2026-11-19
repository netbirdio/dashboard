import * as React from "react";
import integrationImage from "@/assets/integrations/entra-id.png";
import { useTranslations } from "@/i18n/LocaleProvider";
import { IdentityProvider } from "@/interfaces/IdentityProvider";
import { GenericSCIM } from "@/modules/integrations/idp-sync/generic-scim/GenericSCIM";

export const EntraSCIM = () => {
  const t = useTranslations();
  return (
    <GenericSCIM
      provider={IdentityProvider.ENTRA}
      name={t("integrations.idpEntraScimName")}
      description={t("integrations.idpEntraScimDescription")}
      url={{
        title: "microsoft.com",
        href: "https://learn.microsoft.com/en-us/entra/architecture/sync-scim",
      }}
      image={integrationImage}
    />
  );
};
