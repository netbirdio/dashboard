import Paragraph from '@/components/Paragraph';
import SkeletonTable, { SkeletonTableHeader } from '@/components/skeletons/SkeletonTable';
import { usePortalElement } from '@/hooks/usePortalElement';
import React, { Suspense, lazy } from 'react'
import { RemoteJobDropdownButton } from './RemoteJobDropdownButton';
import useFetchApi from '@/utils/api';
import { Job } from '@/interfaces/Job';
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
          </div>

          <div className="inline-flex gap-4 justify-end">
            <RemoteJobDropdownButton />
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
