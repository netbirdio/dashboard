import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import * as React from "react";
import { Suspense } from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import ResourcesTable from "@/modules/networks/resources/ResourcesTable";

type ResourcesSectionProps = {
  network: Network;
};

export const ResourcesSection = ({ network }: ResourcesSectionProps) => {
  const { data: resources, isLoading } = useFetchApi<NetworkResource[]>(
    `/networks/${network.id}/resources`,
  );
  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <div className={"py-7 px-8"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center mb-6"}>
          <div>
            <h2 ref={headingRef}>Resources</h2>
            <Paragraph>Add and manage resources for this network.</Paragraph>
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
          <ResourcesTable
            isLoading={isLoading}
            headingTarget={portalTarget}
            resources={resources}
          />
        </Suspense>
      </div>
    </div>
  );
};
