import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import { Modal, ModalTrigger } from "@components/modal/Modal";
import useFetchApi from "@utils/api";
import { PlusCircle } from "lucide-react";
import { useTranslations } from 'next-intl';
import React, { memo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Peer } from "@/interfaces/Peer";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  isUserDevice?: boolean;
};

function AddPeerButton({ isUserDevice }: Readonly<Props>) {
  const t = useTranslations('peers');
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { oidcUser: user } = useOidcUser();

  const [hasOnboardingFormCompleted] = useLocalStorage(
    "netbird-onboarding-modal",
    false,
  );

  const [isFirstRun, setIsFirstRun] = useLocalStorage<boolean>(
    "netbird-first-run",
    !(peers && peers.length > 0),
  );

  const [installModal, setInstallModal] = useState(
    !hasOnboardingFormCompleted
      ? process.env.APP_ENV !== "test"
        ? false
        : isFirstRun
      : isFirstRun,
  );

  const handleOpenChange = (open: boolean) => {
    setInstallModal(open);
    setIsFirstRun(false);
  };

  return (
    <>
      <Modal open={installModal} onOpenChange={handleOpenChange}>
        <ModalTrigger asChild>
          <Button variant={"primary"} size={"sm"} className={"ml-auto"}>
            <PlusCircle size={16} />
            {t('addPeer')}
          </Button>
        </ModalTrigger>
        <SetupModal user={user} isUserDevice={isUserDevice} />
      </Modal>
    </>
  );
}

export default memo(AddPeerButton);
