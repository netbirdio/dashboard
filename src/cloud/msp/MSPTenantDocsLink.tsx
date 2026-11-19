import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

export const MSPTenantDocsLink = () => {
  const t = useTranslations();

  return (
    <>
      {t("trafficEvents.learnMoreAbout")}
      <InlineLink
        href={"https://docs.netbird.io/how-to/msp-portal"}
        target={"_blank"}
      >
        {t("msp.mSPPortal")}
        <ExternalLinkIcon size={12} />
      </InlineLink>
    </>
  );
};
