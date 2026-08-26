import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";

export const DistributorDocsLink = () => {
  return (
    <>
      Learn more about
      <InlineLink
        href={"https://docs.netbird.io/manage/for-partners/distributor-portal"}
        target={"_blank"}
      >
        Customers
        <ExternalLinkIcon size={12} />
      </InlineLink>
    </>
  );
};
