import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import SquareIcon from "@components/SquareIcon";
import GetStartedTest from "@components/ui/GetStartedTest";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { FlowView } from "@/modules/control-center/header/FlowSelector";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";
import { useCanvasTransitionActive } from "@/modules/control-center/utils/canvas-transition";

// Entrance for the drilled empty-network card. Class names must be literal:
// Tailwind's scanner only emits classes it finds as static text.
const EMPTY_STATE_REVEAL_IN =
  "animate-in fade-in zoom-in-[.97] duration-[700ms] ease-out fill-mode-both";

export function ControlCenterEmptyStates() {
  const { currentView, selectedNetwork, layoutInitialized, instantDrill } =
    useCanvasState();
  const { isDraft } = useDraftMode();
  const { isPeersLoading, isNetworksLoading, peers, networks } =
    useControlCenterData();
  const { openCreateNetworkModal, openResourceModal } = useNetworksContext();
  const { permission } = usePermissions();
  const isTransitioning = useCanvasTransitionActive();

  if (isDraft) return null;

  // Drilled into a single network that has no resources yet — offer the way to
  // fill it (opens the real networks-page resource modal via NetworkProvider,
  // which this overlay is mounted inside).
  const drilledNetwork =
    selectedNetwork !== ""
      ? networks?.find((n) => n.id === selectedNetwork)
      : undefined;
  // Gate on layoutInitialized AND the drill transition being finished — the
  // overlay lives outside the canvas pane, so the transition's opacity fade
  // doesn't cover it; without these it flashes in mid-dive.
  const drilledNetworkEmpty =
    layoutInitialized &&
    !isTransitioning &&
    !!drilledNetwork &&
    (drilledNetwork.resources?.length ?? 0) === 0;

  return (
    <>
      {currentView === FlowView.PEERS &&
        !isPeersLoading &&
        peers?.length === 0 && (
          <div className={"absolute left-0 top-0 z-10 w-full mt-28"}>
            <NoPeersGettingStarted showBackground={false} />
          </div>
        )}

      {currentView === FlowView.NETWORKS &&
        !isNetworksLoading &&
        drilledNetworkEmpty && (
          <div
            className={`absolute left-0 top-0 z-10 w-full mt-28 ${
              instantDrill ? "" : EMPTY_STATE_REVEAL_IN
            }`}
          >
            <GetStartedTest
              showBackground={false}
              cardClassName={"bg-transparent border-0"}
              icon={
                <SquareIcon
                  icon={
                    <NetworkRoutesIcon
                      className={"fill-nb-gray-200"}
                      size={20}
                    />
                  }
                  color={"gray"}
                  size={"large"}
                />
              }
              title={"Create Resources"}
              description={
                "It looks like you don't have any resources. Add internal services like hosts, subnets or domains so your peers can reach them."
              }
              button={
                <div
                  className={"gap-x-4 flex items-center justify-center"}
                >
                  <Button
                    variant={"primary"}
                    onClick={() =>
                      drilledNetwork && openResourceModal(drilledNetwork)
                    }
                    disabled={!permission.networks.update}
                  >
                    <PlusCircle size={16} />
                    Add Resource
                  </Button>
                </div>
              }
              learnMore={
                <>
                  Learn more about
                  <InlineLink
                    href={"https://docs.netbird.io/how-to/networks#resources"}
                    target={"_blank"}
                  >
                    Resources
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          </div>
        )}

      {currentView === FlowView.NETWORKS &&
        !isNetworksLoading &&
        selectedNetwork === "" &&
        networks?.length === 0 && (
          <div className={"absolute left-0 top-0 z-10 w-full mt-28"}>
            <GetStartedTest
              showBackground={false}
              cardClassName={"bg-transparent border-0"}
              icon={
                <SquareIcon
                  icon={
                    <NetworkRoutesIcon
                      className={"fill-nb-gray-200"}
                      size={20}
                    />
                  }
                  color={"gray"}
                  size={"large"}
                />
              }
              title={"Create New Network"}
              description={
                "It looks like you don't have any networks. Access internal resources in your LANs and VPC by adding a network."
              }
              button={
                <div
                  className={"gap-x-4 flex items-center justify-center"}
                >
                  <Button
                    variant={"primary"}
                    onClick={openCreateNetworkModal}
                    disabled={!permission.networks.create}
                  >
                    <PlusCircle size={16} />
                    Add Network
                  </Button>
                </div>
              }
              learnMore={
                <>
                  Learn more about
                  <InlineLink
                    href={"https://docs.netbird.io/how-to/networks"}
                    target={"_blank"}
                  >
                    Networks
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                </>
              }
            />
          </div>
        )}
    </>
  );
}
