import SkeletonTable, {
  SkeletonTableHeader,
} from "@components/skeletons/SkeletonTable";
import * as React from "react";
import { Suspense, useMemo } from "react";
import { NetworkRouter } from "@/interfaces/Network";
import NetworkRoutingPeersTable from "@/modules/networks/routing-peers/NetworkRoutingPeersTable";
import useFetchApi from "@utils/api";
import { useGroups } from "@/contexts/GroupsProvider";
import { Peer } from "@/interfaces/Peer";
import { useUsers } from "@/contexts/UsersProvider";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";
import { ExternalLinkIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export const NetworkRoutingPeersTabContent = ({
  routers,
  isLoading,
}: {
  routers?: NetworkRouter[];
  isLoading: boolean;
}) => {
  const { t } = useI18n();
  const { groups } = useGroups();
  const { users } = useUsers();
  const { data: peers } = useFetchApi<Peer[]>(`/peers`);

  const data = useMemo(() => {
    return routers?.map((router) => {
      const peer = peers?.find((peer) => peer.id === router.peer);
      const user = peer ? users?.find((user) => user.id === peer.user_id) : undefined;
      const group = groups?.find(
        (group) => group.id === router?.peer_groups?.[0],
      );

      return {
        ...router,
        search: `${peer?.name ?? ""} ${peer?.ip ?? ""} ${user?.name ?? ""} ${user?.id ?? ""} ${group?.name ?? ""}`,
      };
    });
  }, [users, peers, routers, groups]);

  return (
    <div className={"px-8"} id={"routing-peers"}>
      <div className={"flex justify-between items-center mb-5"}>
        <div>
          <Paragraph>
            {t("networkRouting.tabDescription")}
          </Paragraph>
          <Paragraph>
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/manage/networks#routing-peers"}
              target={"_blank"}
            >
              {t("networkDetails.routingPeers")}
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
        <NetworkRoutingPeersTable isLoading={isLoading} routers={data} />
      </Suspense>
    </div>
  );
};
