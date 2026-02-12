import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { Suspense } from "react";
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
  emptyTableTitle = "This network has no services",
  emptyTableDescription = "Create resources and expose services securely through NetBird's reverse proxy.",
}: Props) => {
  return (
    <div className={"pb-10 px-8"}>
      <div className={"flex justify-between items-center mb-5"}>
        <div>
          <Paragraph>
            Expose services securely through NetBird&apos;s reverse proxy.
          </Paragraph>
          <Paragraph>
            Learn more about
            <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
              Services
              <ExternalLinkIcon size={12} />
            </InlineLink>
            in our documentation.
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
          emptyTableTitle={emptyTableTitle}
          emptyTableDescription={emptyTableDescription}
        />
      </Suspense>
    </div>
  );
};
