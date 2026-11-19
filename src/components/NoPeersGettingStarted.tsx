import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import AddPeerDropdown from "@components/ui/AddPeerDropdown";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  showBackground?: boolean;
};

export const NoPeersGettingStarted = ({
  showBackground = true,
}: Readonly<Props>) => {
  const translate = useTranslations();
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
      title={translate("components.getStarted")}
      description={
        "It looks like you don't have any connected machines.\n" +
        "Get started by adding one to your network."
      }
      button={<AddPeerDropdown />}
      learnMore={
        <>
          {translate("components.learnMoreInOur")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started"}
            target={"_blank"}
          >
            {translate("components.gettingStartedGuide")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </>
      }
    />
  );
};
