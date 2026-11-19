import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useAccount } from "@/modules/account/useAccount";

export const DistributorTransferAccountModal = () => {
  const t = useTranslations();
  const { mspInfo } = useMSP();
  const account = useAccount();
  const { confirm } = useDialog();
  const { isOwner } = useLoggedInUser();
  const { mutate } = useSWRConfig();
  const resellerRequest = useApiCall<string>(
    "/integrations/msp/reseller/msps",
    true,
  );

  const hasResellerInvite = mspInfo?.reseller_status === "invited";

  const [open, setOpen] = useState(true);

  const grantAccess = async () => {
    const choice = await confirm({
      title: t("distributor.grantAccessToDistributor"),
      description: t("msp.areYouSureYouWantToGrantAccessThisAction"),
      confirmText: t("msp.grantAccess"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: t("distributor.grantingAccessToDistributor"),
      description: t("msp.accessHasBeenSuccessfullyGranted"),
      loadingMessage: t("msp.grantingAccess"),
      promise: resellerRequest
        .put(
          {
            value: "accept",
          },
          `/${account?.id}/invite`,
        )
        .finally(() => {
          setOpen(false);
          mutate("/integrations/msp/reseller");
          mutate("/integrations/msp");
        }),
    });
  };

  const deny = () => {
    notify({
      title: t("msp.accessRequestDenied"),
      description: t("distributor.youHaveDeniedTheDistributorAccessRequest"),
      loadingMessage: t("msp.decliningAccess"),
      promise: resellerRequest
        .put(
          {
            value: "decline",
          },
          `/${account?.id}/invite`,
        )
        .finally(() => {
          setOpen(false);
          mutate("/integrations/msp/reseller");
          mutate("/integrations/msp");
        }),
    });
  };

  if (!hasResellerInvite) return;

  return (
    isOwner && (
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
          <div
            className={
              "mx-auto text-center flex flex-col items-center justify-center mt-3 z-[1] px-6"
            }
          >
            <h2
              className={"text-lg my-0 leading-[1.5] text-center text-balance"}
            >
              {t("distributor.aDistributorIsRequestingAccessToYourAccount")}
            </h2>
            <Paragraph
              className={cn("text-sm text-center max-w-[450px] px-4 mt-2")}
            >
              {t(
                "distributor.grantingAccessAllowsTheDistributorToManageBillingAndSubscription",
              )}
            </Paragraph>
            <div className={"flex gap-4 items-center mt-6 w-full"}>
              <Button className={"w-full"} variant={"secondary"} onClick={deny}>
                {t("common.deny")}
              </Button>
              <Button
                className={"w-full"}
                variant={"danger"}
                onClick={grantAccess}
              >
                {t("msp.grantAccess")}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    )
  );
};
