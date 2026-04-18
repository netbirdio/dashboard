import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useI18n } from "@/i18n/I18nProvider";
import PeerIcon from "@/assets/icons/PeerIcon";

type Props = {
  showBackground?: boolean;
};

export const NoPeersGettingStarted = ({ showBackground = true }) => {
  const { t } = useI18n();
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
      title={t("noPeersGettingStarted.title")}
      description={t("noPeersGettingStarted.description")}
      button={<AddPeerButton />}
      learnMore={
        <>
          {t("noPeersGettingStarted.learnMorePrefix")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started"}
            target={"_blank"}
          >
            {t("noPeersGettingStarted.gettingStartedGuide")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
          {t("noPeersGettingStarted.learnMoreSuffix")}
        </>
      }
    />
  );
};
