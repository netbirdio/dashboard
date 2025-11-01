import Button from "@components/Button";
import { Modal, ModalTrigger } from "@components/modal/Modal";
import { DownloadIcon } from "lucide-react";
import React, { useState } from "react";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

export function InstallNetBirdButton() {
  const [installModal, setInstallModal] = useState(false);

  return (
    <Modal open={installModal} onOpenChange={setInstallModal}>
      <ModalTrigger asChild>
        <Button variant={"secondary"} size={"sm"}>
          <DownloadIcon size={16} />
          Install NetBird
        </Button>
      </ModalTrigger>
      <SetupModal />
    </Modal>
  );
}
