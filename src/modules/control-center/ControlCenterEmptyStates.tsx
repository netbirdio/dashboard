import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { NoPeersGettingStarted } from "@components/NoPeersGettingStarted";
import SquareIcon from "@components/SquareIcon";
import GetStartedTest from "@components/ui/GetStartedTest";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { FlowView } from "@/modules/control-center/FlowSelector";
import { ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

export function ControlCenterEmptyStates() {
  const { currentView } = useCanvasState();
  const { isPeersLoading, isNetworksLoading, peers, networks } =
    useControlCenterData();
  const router = useRouter();
  const { permission } = usePermissions();

  return (
    <>
      {currentView === FlowView.PEERS &&
        !isPeersLoading &&
        peers?.length === 0 && (
          <div className={"absolute left-0 top-0 w-full mt-20"}>
            <NoPeersGettingStarted showBackground={false} />
          </div>
        )}

      {currentView === FlowView.NETWORKS &&
        !isNetworksLoading &&
        networks?.length === 0 && (
          <div className={"absolute left-0 top-0 w-full mt-20"}>
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
                    onClick={() => router.push("/networks")}
                    disabled={!permission.networks.create}
                  >
                    Go to Networks
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
