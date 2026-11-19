import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { DownloadIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  onBack: () => void;
  firstDevice?: Peer;
  onFinish?: () => void;
};

export const OnboardingFirstDevice = ({
  onBack,
  firstDevice,
  onFinish,
}: Props) => {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  /**
   * Continue to next step once first device is recognized
   */
  useEffect(() => {
    firstDevice && onFinish?.();
  }, [firstDevice]);

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
      <div>
        <h1 className={"text-xl text-center"}>
          {t("onboarding.letSGetYourFirstDeviceOnline")}
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
          }
        >
          {t("onboarding.toAccessOtherMachinesInstallNetBirdSignInAndYour")}
        </div>
      </div>

      <div className={"flex items-center justify-center mt-4 gap-3"}>
        <Button variant={"secondary"} onClick={onBack}>
          {t("onboarding.goBack")}
        </Button>
        <Button variant={"primary"} onClick={() => setOpen(true)}>
          <DownloadIcon size={16} />
          {t("onboarding.installNetBird")}
        </Button>
      </div>

      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent className={"!z-[70]"}>
          <SetupModalContent
            title={t("onboarding.installNetBird")}
            isUserDevice={true}
          />
        </ModalContent>
      </Modal>
    </div>
  );
};
