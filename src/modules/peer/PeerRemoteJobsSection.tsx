import { ExternalLinkIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import InlineLink from "@/components/InlineLink";
import Paragraph from "@/components/Paragraph";
import SkeletonTable, {
  SkeletonTableHeader,
} from "@/components/skeletons/SkeletonTable";
import { useI18n } from "@/i18n/I18nProvider";
import { Job } from "@/interfaces/Job";
import useFetchApi from "@/utils/api";

const PeerRemoteJobsTable = lazy(
  () => import("@/modules/jobs/table/PeerRemoteJobsTable"),
);
type Props = {
  peerID: string;
};

export const PeerRemoteJobsSection = ({ peerID }: Props) => {
  const { t } = useI18n();
  const { data: jobs, isLoading } = useFetchApi<Job[]>(`/peers/${peerID}/jobs`);

  return (
    <div className="pb-10 px-8">
      <div className="">
        <div className="flex justify-between items-center mb-5">
          <div>
            <Paragraph>
              {t("remoteJobs.sectionDescription")}
            </Paragraph>
            <Paragraph>
              {t("common.learnMorePrefix")}{" "}
              <InlineLink href={"https://docs.netbird.io"} target={"_blank"}>
                {t("jobs.title")} <ExternalLinkIcon size={12} />
              </InlineLink>
              {t("common.inDocumentationSuffix")}
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
