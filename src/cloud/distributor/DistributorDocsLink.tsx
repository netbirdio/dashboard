import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

export const DistributorDocsLink = () => {
  const t = useTranslations();
  return (
    <>
      Learn more about
      <InlineLink
        href={"https://docs.netbird.io/manage/for-partners/distributor-portal"}
        target={"_blank"}
      >
        {t("distributor.customers")}
        <ExternalLinkIcon size={12} />
      </InlineLink>
    </>
  );
};
