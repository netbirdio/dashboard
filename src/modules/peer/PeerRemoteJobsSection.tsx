import Paragraph from '@/components/Paragraph';
import SkeletonTable, { SkeletonTableHeader } from '@/components/skeletons/SkeletonTable';
import { usePortalElement } from '@/hooks/usePortalElement';
import React, { Suspense, lazy } from 'react'
import useFetchApi from '@/utils/api';
import { Job } from '@/interfaces/Job';
import InlineLink from '@/components/InlineLink';
import { ExternalLinkIcon } from 'lucide-react';
const PeerRemoteJobsTable = lazy(
  () => import("@/modules/peer/PeerRemoteJobsTable"),
);
type Props = {
  peerID: string;
};

export const PeerRemoteJobsSection = ({ peerID }: Props) => {
  const { data: jobs, isLoading } = useFetchApi<Job[]>(`/peers/${peerID}/jobs`);
  const { ref: headingRef, portalTarget } = usePortalElement<HTMLHeadingElement>();

  return (
    <div className="pb-10 px-8">
      <div className="max-w-6xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 ref={headingRef}>Remote Jobs</h2>
            <Paragraph>
              Remotely trigger actions such as debug bundles or other tasks on
              this peer, without requiring CLI access.
            </Paragraph>
            <Paragraph>
              Learn more about{" "}
              <InlineLink href={"https://docs.netbird.io"} target={"_blank"} >
                Remote Jobs <ExternalLinkIcon size={12} />
              </InlineLink>
              in our documentation.
            </Paragraph>
          </div>
        </div>

        <Suspense
          fallback={
            <div>
              <SkeletonTableHeader className="!p-0" />
              <div className="mt-8 w-full">
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          <PeerRemoteJobsTable
            peerID={peerID}
            jobs={jobs}
            isLoading={isLoading}
            headingTarget={portalTarget}
          />

        </Suspense>
      </div>
    </div>)
}
