import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import SquareIcon from "@components/SquareIcon";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { FlowView } from "@/modules/control-center/header/FlowSelector";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCanvasTransitionActive } from "@/modules/control-center/utils/canvas-transition";
import { useNetworksContext } from "@/modules/networks/NetworkProvider";

// Must stay a literal: Tailwind only emits classes it finds as static text.
const EMPTY_STATE_REVEAL_IN =
  "animate-in fade-in zoom-in-[.97] duration-[700ms] ease-out fill-mode-both";

export function ControlCenterEmptyStates() {
  const translate = useTranslations();
  const { currentView, selectedNetwork, layoutInitialized, instantDrill } =
    useCanvasState();
  const { isDraft } = useDraftMode();
  const { isPeersLoading, isNetworksLoading, peers, networks } =
    useControlCenterData();
  const { openCreateNetworkModal, openResourceModal } = useNetworksContext();
  const { permission } = usePermissions();
  const isTransitioning = useCanvasTransitionActive();

  if (isDraft) return null;

  const drilledNetwork =
    selectedNetwork !== ""
      ? networks?.find((n) => n.id === selectedNetwork)
      : undefined;
  // The overlay lives outside the canvas pane, so the drill transition's fade
  // doesn't cover it and it would otherwise flash in mid-dive.
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
              title={translate("controlCenter.createResources")}
              description={translate("controlCenter.itLooksLikeYouDonTHaveAny")}
              button={
                <div className={"gap-x-4 flex items-center justify-center"}>
                  <Button
                    variant={"primary"}
                    onClick={() =>
                      drilledNetwork && openResourceModal(drilledNetwork)
                    }
                    disabled={!permission.networks.update}
                  >
                    <PlusCircle size={16} />
                    {translate("common.addResource")}
                  </Button>
                </div>
              }
              learnMore={
                <>
                  {translate.rich("controlCenter.learnAboutResources", {
                    link: (chunks) => (
                      <InlineLink
                        href={
                          "https://docs.netbird.io/how-to/networks#resources"
                        }
                        target={"_blank"}
                      >
                        {chunks}
                        <ExternalLinkIcon size={12} />
                      </InlineLink>
                    ),
                  })}
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
              title={translate("controlCenter.createNewNetwork")}
              description={translate(
                "controlCenter.itLooksLikeYouDonTHaveAny2",
              )}
              button={
                <div className={"gap-x-4 flex items-center justify-center"}>
                  <Button
                    variant={"primary"}
                    onClick={openCreateNetworkModal}
                    disabled={!permission.networks.create}
                  >
                    <PlusCircle size={16} />
                    {translate("common.addNetwork")}
                  </Button>
                </div>
              }
              learnMore={
                <>
                  {translate.rich("controlCenter.learnAboutNetworks", {
                    link: (chunks) => (
                      <InlineLink
                        href={"https://docs.netbird.io/how-to/networks"}
                        target={"_blank"}
                      >
                        {chunks}
                        <ExternalLinkIcon size={12} />
                      </InlineLink>
                    ),
                  })}
                </>
              }
            />
          </div>
        )}
    </>
  );
}
