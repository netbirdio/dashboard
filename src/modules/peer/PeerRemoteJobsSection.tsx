import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import InlineLink from "@/components/InlineLink";
import Paragraph from "@/components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@/components/skeletons/SkeletonTable";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Job } from "@/interfaces/Job";
import useFetchApi from "@/utils/api";

const PeerRemoteJobsTable = lazy(
  () => import("@/modules/jobs/table/PeerRemoteJobsTable"),
);
type Props = {
  peerID: string;
};

export const PeerRemoteJobsSection = ({ peerID }: Props) => {
  const t = useTranslations();
  const { data: jobs, isLoading } = useFetchApi<Job[]>(`/peers/${peerID}/jobs`);

  return (
    <div className="pb-10 px-8">
      <div className="">
        <div className="flex justify-between items-center mb-5">
          <div>
            <Paragraph>
              {t("peer.remoteJobsDesc")}{" "}
              <InlineLink
                href={"https://docs.netbird.io/manage/peers/remote-jobs"}
                target={"_blank"}
              >
                {t("common.learnMore")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
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
          />
        </Suspense>
      </div>
    </div>
  );
};
