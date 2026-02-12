import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import * as React from "react";
import { Suspense } from "react";
import { NetworkResource } from "@/interfaces/Network";
import ResourcesTable from "@/modules/networks/resources/ResourcesTable";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";

type ResourcesSectionProps = {
  data?: NetworkResource[];
  isLoading: boolean;
};

export const ResourcesTabContent = ({
  data,
  isLoading,
}: ResourcesSectionProps) => {
  return (
    <div className={"px-8"}>
      <div className={"flex justify-between items-center mb-5"}>
        <div>
          <Paragraph>
            Add resources to this network to control what peers can access.
          </Paragraph>
          <Paragraph>
            Learn more about{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/networks#resources"}
              target={"_blank"}
            >
              Resources
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
        <ResourcesTable isLoading={isLoading} resources={data} />
      </Suspense>
    </div>
  );
};
