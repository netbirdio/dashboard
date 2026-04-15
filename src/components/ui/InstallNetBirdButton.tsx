import Button from "@components/Button";
import { Modal, ModalTrigger } from "@components/modal/Modal";
import { DownloadIcon } from "lucide-react";
import React, { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

export function InstallNetBirdButton() {
  const { t } = useI18n();
  const [installModal, setInstallModal] = useState(false);

  return (
    <Modal open={installModal} onOpenChange={setInstallModal}>
      <ModalTrigger asChild>
        <Button variant={"secondary"} size={"sm"}>
          <DownloadIcon size={16} />
          {t("common.installNetBird")}
        </Button>
      </ModalTrigger>
      <SetupModal />
    </Modal>
  );
}
