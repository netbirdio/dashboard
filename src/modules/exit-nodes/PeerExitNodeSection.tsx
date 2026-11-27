import Card from "@components/Card";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { DataTable } from "@components/table/DataTable";
import { fadeDisabledRowCells } from "@components/table/disabledRowCells";
import NoResults from "@components/ui/NoResults";
import { IconDirectionSign } from "@tabler/icons-react";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { lazy, Suspense, useMemo } from "react";
import { Peer } from "@/interfaces/Peer";
import {
  EXIT_NODES_DOCS_URL,
  getPeerExitNode,
  isLegacyExitNodeRoute,
} from "@/modules/exit-nodes/exitNodeHelpers";
import ExitNodesProvider, {
  useExitNodes,
} from "@/modules/exit-nodes/ExitNodesProvider";
import { PeerExitNodeButton } from "@/modules/exit-nodes/PeerExitNodeButton";
import ExitNodePeersTable from "@/modules/exit-nodes/table/ExitNodePeersTable";
import {
  ExitNodeTableColumnsNarrow,
  useExitNodeRows,
} from "@/modules/exit-nodes/table/ExitNodesTable";
import usePeerRoutes from "@/modules/peer/usePeerRoutes";

const PeerRoutesTable = lazy(() => import("@/modules/peer/PeerRoutesTable"));

type Props = {
  peer: Peer;
};

/** Peer page tab: the exit node this peer is part of. */
export const PeerExitNodeSection = ({ peer }: Readonly<Props>) => (
  <ExitNodesProvider>
    <PeerExitNodeSectionContent peer={peer} />
  </ExitNodesProvider>
);

const PeerExitNodeSectionContent = ({ peer }: Readonly<Props>) => {
  const { exitNodes, isLoading } = useExitNodes();
  const exitNode = getPeerExitNode(exitNodes, peer.id);
  const rows = useExitNodeRows(
    useMemo(() => (exitNode ? [exitNode] : []), [exitNode]),
  );

  return (
    <div className={"pb-10 px-8"}>
      <div className={"flex justify-between items-center mb-5 gap-4"}>
        <Paragraph>
          Route internet traffic through this peer. Add it to an exit node, then
          use access control policies to decide who can use it.{" "}
          <InlineLink href={EXIT_NODES_DOCS_URL} target={"_blank"}>
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
        {!isLoading && !exitNode && <PeerExitNodeButton peer={peer} />}
      </div>

      <DataTable
        wrapperComponent={Card}
        wrapperProps={{ className: "w-full" }}
        text={"Exit Node"}
        tableClassName={"mt-0"}
        minimal={true}
        showSearchAndFilters={false}
        inset={false}
        isLoading={isLoading}
        columns={ExitNodeTableColumnsNarrow}
        columnVisibility={{ search: false }}
        cellClassName={fadeDisabledRowCells}
        data={rows}
        renderExpandedRow={(node) => <ExitNodePeersTable exitNode={node} />}
        paginationPaddingClassName={"px-0 pt-8"}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"This peer is not part of an exit node"}
            description={
              "Set up an exit node with this peer to route internet traffic through it."
            }
            icon={
              <IconDirectionSign size={20} className={"text-nb-gray-300"} />
            }
          />
        }
      />

      <LegacyExitNodeRoutes peer={peer} />
    </div>
  );
};

/**
 * Exit nodes made as network routes before exit nodes had their own API.
 * Listed here rather than under Network Routes until they are converted.
 */
const LegacyExitNodeRoutes = ({ peer }: Readonly<Props>) => {
  const { peerRoutes, isLoading } = usePeerRoutes({ peer });
  const legacyRoutes = useMemo(
    () => peerRoutes?.filter(isLegacyExitNodeRoute),
    [peerRoutes],
  );
  if (isLoading || !legacyRoutes?.length) return null;

  return (
    <div className={"mt-10"}>
      <Paragraph className={"mb-5"}>
        This peer also routes internet traffic through network routes set up
        before exit nodes had their own page.
      </Paragraph>
      <Suspense fallback={null}>
        <PeerRoutesTable
          peer={peer}
          isLoading={false}
          peerRoutes={legacyRoutes}
        />
      </Suspense>
    </div>
  );
};
