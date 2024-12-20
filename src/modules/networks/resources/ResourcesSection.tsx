import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import { usePortalElement } from "@hooks/usePortalElement";
import { IconCirclePlus } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import * as React from "react";
import { Suspense } from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
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

  const { openResourceModal } = useNetworksContext();

  return (
    <div className={"py-7 px-8"}>
      <div className={"max-w-6xl"}>
        <div className={"flex justify-between items-center"}>
          <div>
            <h2 ref={headingRef}>Resources</h2>
            <Paragraph>Add and manage resources for this network.</Paragraph>
          </div>
          <div className={"inline-flex gap-4 justify-end"}>
            <div>
              <Button
                variant={"primary"}
                onClick={() => openResourceModal(network)}
              >
                <IconCirclePlus size={16} />
                Add Resource
              </Button>
            </div>
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
