import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import PeerIcon from "@/assets/icons/PeerIcon";

type Props = {
  showBackground?: boolean;
};

export const NoPeersGettingStarted = ({ showBackground = true }) => {
  return (
    <GetStartedTest
      showBackground={showBackground}
      icon={
        <SquareIcon
          icon={<PeerIcon className={"fill-nb-gray-200"} size={20} />}
          color={"gray"}
          size={"large"}
        />
      }
      title={"Get Started with NetBird"}
      description={
        "It looks like you don't have any connected machines.\n" +
        "Get started by adding one to your network."
      }
      button={<AddPeerButton />}
      learnMore={
        <>
          Learn more in our{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started"}
            target={"_blank"}
          >
            Getting Started Guide
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </>
      }
    />
  );
};
