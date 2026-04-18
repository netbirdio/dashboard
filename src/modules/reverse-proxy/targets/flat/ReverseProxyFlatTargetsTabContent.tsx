import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { Suspense } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  REVERSE_PROXY_DOCS_LINK,
  ReverseProxyFlatTarget,
} from "@/interfaces/ReverseProxy";
import { ReverseProxyFlatTargetsTable } from "@/modules/reverse-proxy/targets/flat/ReverseProxyFlatTargetsTable";

type Props = {
  targets: ReverseProxyFlatTarget[];
  isLoading?: boolean;
  hideResourceColumn?: boolean;
  emptyTableTitle?: string;
  emptyTableDescription?: string;
};

export const ReverseProxyFlatTargetsTabContent = ({
  targets,
  isLoading,
  hideResourceColumn,
  emptyTableTitle,
  emptyTableDescription,
}: Props) => {
  const { t } = useI18n();
  return (
    <div className={"pb-10 px-8"}>
      <div className={"flex justify-between items-center mb-5"}>
        <div>
          <Paragraph>
            {t("reverseProxyTargets.description")}
          </Paragraph>
          <Paragraph>
            {t("common.learnMorePrefix")}{" "}
            <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
              {t("nav.services")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
            {t("common.inDocumentationSuffix")}
          </Paragraph>
        </div>
      </div>
      <Suspense
        fallback={
          <div>
            <SkeletonTableHeader className={"!p-0"} />
            <div className={"mt-8 w-full"}>
              <SkeletonTable withHeader={false} />
            </div>
          </div>
        }
      >
        <ReverseProxyFlatTargetsTable
          targets={targets}
          isLoading={isLoading}
          hideResourceColumn={hideResourceColumn}
          emptyTableTitle={emptyTableTitle ?? t("reverseProxyTargets.emptyTitle")}
          emptyTableDescription={
            emptyTableDescription ?? t("reverseProxyTargets.emptyDescription")
          }
        />
      </Suspense>
    </div>
  );
};
