import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { GlobeIcon } from "lucide-react";
import * as React from "react";
import { DistributorCustomer } from "@/cloud/distributor/interfaces/Distributor";
import { useTranslations } from "@/i18n/LocaleProvider";

type Props = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  customer: DistributorCustomer;
  onAccept: (c: DistributorCustomer) => void;
  onCancel: (c: DistributorCustomer) => void;
};

export const DistributorAccountExistsModal = ({
  open,
  setOpen,
  customer,
  onAccept,
  onCancel,
}: Props) => {
  const t = useTranslations();
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent
        showClose={false}
        maxWidthClass={"max-w-md"}
        className={"z-[9999]"}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <GradientFadedBackground />
        <div className={"flex flex-col gap-2 px-8 z-[1]"}>
          <div
            className={
              "text-sm w-full text-center text-white py-2 rounded-lg flex items-center justify-center gap-2"
            }
          >
            <GlobeIcon size={16} className={"text-netbird"} />
            {customer?.domain}
          </div>
          <div className={"text-xl font-medium text-center mb-1"}>
            {t.rich("msp.thisNetBirdAccountAlreadyExistsInOurSystem", {
              part0: () => <br />,
            })}
          </div>
          <div className={"text-sm text-nb-gray-300 text-center"}>
            {t.rich("msp.toManageTheAccountYouMustFirstRequestAccessFrom", {
              part0: (chunks) => <span className="text-white">{chunks}</span>,
              part1: () => customer?.domain,
            })}
          </div>
          <div className={"text-sm text-nb-gray-300 text-center"}></div>
          <Callout>{t("msp.theAccountOwnerMustLogInToTheDashboardTo")}</Callout>
        </div>

        <ModalFooter separator={false} className={"gap-x-2"}>
          <Button
            autoFocus={true}
            className={"w-full"}
            variant={"secondary"}
            onClick={() => onCancel(customer)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            autoFocus={true}
            className={"w-full"}
            variant={"primary"}
            onClick={() => onAccept(customer)}
          >
            {t("common.requestAccess")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
