import Button from "@components/Button";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { cn } from "@utils/helpers";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";

export const PlanSuccessModal = () => {
  const t = useTranslations();
  const params = useSearchParams();
  const subscriptionSuccess = params.get("success");
  const [successModal, setSuccessModal] = useState(
    subscriptionSuccess === "true",
  );
  return (
    <Modal open={successModal} onOpenChange={setSuccessModal}>
      <ModalContent maxWidthClass={"max-w-sm relative"} showClose={false}>
        <GradientFadedBackground />

        <div
          className={
            "mx-auto text-center flex flex-col items-center justify-center "
          }
        >
          <h2 className={"text-xl my-0 leading-[1.5] mb-2"}>
            {t.rich("billing.thankYouForSubscribingToNetBird", {
              part0: () => <br />,
            })}
          </h2>
          <Paragraph className={cn("text-sm text-center max-w-xs")}>
            {t(
              "billing.yourSubscriptionHasBeenSuccessfullyActivatedYouHaveNowFull",
            )}
          </Paragraph>
          <ModalClose asChild={true}>
            <Button variant={"primary"} className={"w-full mt-4"} size={"xs"}>
              {t("common.close")}
            </Button>
          </ModalClose>
        </div>
      </ModalContent>
    </Modal>
  );
};
