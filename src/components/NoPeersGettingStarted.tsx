import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import AddPeerDropdown from "@components/ui/AddPeerDropdown";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import PeerIcon from "@/assets/icons/PeerIcon";

type Props = {
  showBackground?: boolean;
};

export const NoPeersGettingStarted = ({
  showBackground = true,
}: Readonly<Props>) => {
  const t = useTranslations("peers");
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
      title={t("getStarted")}
      description={t("getStartedDescription")}
      button={<AddPeerDropdown />}
      learnMore={
        <>
          {t("learnMoreInOur")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started"}
            target={"_blank"}
          >
            {t("gettingStartedGuide")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </>
      }
    />
  );
};
