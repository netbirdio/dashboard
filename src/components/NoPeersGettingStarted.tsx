import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import AddPeerButton from "@components/ui/AddPeerButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from 'next-intl';
import * as React from "react";
import PeerIcon from "@/assets/icons/PeerIcon";

type Props = {
  showBackground?: boolean;
  // When set, tailors the empty-state copy and threads isUserDevice
  // through AddPeerButton so the right Install NetBird flow opens:
  //   true  → User Devices empty state (browser/SSO flow, mobile tabs).
  //   false → Servers empty state (setup-key flow, no mobile tabs).
  //   undefined → legacy/global empty state (no kind preference).
  isUserDevice?: boolean;
};

export const NoPeersGettingStarted = ({
  showBackground = true,
  isUserDevice,
}: Readonly<Props>) => {
  const t = useTranslations('peers');
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
      title={t('getStarted')}
      description={t('getStartedDescription')}
      button={<AddPeerButton isUserDevice={isUserDevice} />}
      learnMore={
        <>
          {t('learnMoreInOur')}{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/getting-started"}
            target={"_blank"}
          >
            {t('gettingStartedGuide')}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </>
      }
    />
  );
};
