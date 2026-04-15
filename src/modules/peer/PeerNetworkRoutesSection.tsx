import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import * as React from "react";
import { lazy, Suspense } from "react";
import type { Peer } from "@/interfaces/Peer";
import { AddExitNodeButton } from "@/modules/exit-node/AddExitNodeButton";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";
import AddRouteDropdownButton from "@/modules/peer/AddRouteDropdownButton";
import usePeerRoutes from "@/modules/peer/usePeerRoutes";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const PeerRoutesTable = lazy(() => import("@/modules/peer/PeerRoutesTable"));

type Props = {
  peer: Peer;
};

export const PeerNetworkRoutesSection = ({ peer }: Props) => {
  const { t } = useI18n();
  const { peerRoutes, isLoading } = usePeerRoutes({ peer });
  const exitNodeInfo = useHasExitNodes(peer);

  return (
    <div className={"pb-10 px-8"}>
      <div className={""}>
        <div className={"flex justify-between items-center mb-5"}>
          <div>
            <Paragraph>
              {t("peerNetworkRoutes.description")}
            </Paragraph>
            <Paragraph>
              {t("common.learnMorePrefix")}{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                }
                target={"_blank"}
              >
                {t("networkRoutesPage.title")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
              {t("common.inDocumentationSuffix")}
            </Paragraph>
          </div>
          <div className={"inline-flex gap-4 justify-end"}>
            <div className={"gap-4 flex"}>
              <AddExitNodeButton
                peer={peer}
                firstTime={!exitNodeInfo.hasExitNode}
              />
              <AddRouteDropdownButton />
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div>
              <div className={"mt-0 w-full"}>
                <SkeletonTable withHeader={false} />
              </div>
            </div>
          }
        >
          <PeerRoutesTable
            peer={peer}
            isLoading={isLoading}
            peerRoutes={peerRoutes}
          />
        </Suspense>
      </div>
    </div>
  );
};
