import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import { Modal, ModalTrigger } from "@components/modal/Modal";
import useFetchApi from "@utils/api";
import { PlusCircle } from "lucide-react";
import { memo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Peer } from "@/interfaces/Peer";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

function AddPeerButton() {
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { oidcUser: user } = useOidcUser();

  const [isFirstRun, setIsFirstRun] = useLocalStorage<boolean>(
    "netbird-first-run",
    !(peers && peers.length > 0),
  );

  const [setupModal, setSetupModal] = useState(isFirstRun);

  const handleOpenChange = (open: boolean) => {
    setSetupModal(open);
    setIsFirstRun(false);
  };

  return (
    <Modal open={setupModal} onOpenChange={handleOpenChange}>
      <ModalTrigger asChild>
        <Button variant={"primary"} size={"sm"} className={"ml-auto"}>
          <PlusCircle size={16} />
          Add Peer
        </Button>
      </ModalTrigger>
      <SetupModal user={user} />
    </Modal>
  );
}

export default memo(AddPeerButton);
