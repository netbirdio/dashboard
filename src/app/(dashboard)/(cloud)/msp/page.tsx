"use client";

import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import useRedirect from "@hooks/useRedirect";
import { useApiCall } from "@utils/api";
import { LockIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function JoinMspPage() {
  const t = useTranslations();

  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const { mutate } = useSWRConfig();
  const router = useRouter();
  const { isMspInfoLoading, mspInfo, isActive, isAccountWithMSPParent } =
    useMSP();
  const [open, setOpen] = useState(true);
  const { isOwner } = useLoggedInUser();
  const [isAccepting, setIsAccepting] = useState(false);
  const [calledOnce, setCalledOnce] = useState(false);
  const isMSPAccount = !!mspInfo && isActive;

  const mspRequest = useApiCall<string>("/integrations/msp", true, {
    ignoreGlobalParams: true,
  });

  const declineButtonText = useMemo(() => {
    if (isMSPAccount && !calledOnce) return t("msp.goToTenants");
    if (isOwner) return t("msp.decline");
    return t("routeGroup.goToPeers");
  }, [isMSPAccount, calledOnce, isOwner, t]);

  if (isAccountWithMSPParent || !inviteCode) return <Redirect />;

  const acceptInvitation = async () => {
    if (isAccepting) return;
    setCalledOnce(true);
    setIsAccepting(true);
    const promise = mspRequest
      .post({
        invite: inviteCode,
      })
      .then(() => {
        mutate("/integrations/msp");
        mutate("/integrations/msp/tenants");
        router.push("/tenants");
      })
      .finally(() => setIsAccepting(false));

    notify({
      title: t("msp.netBirdManagedServiceProvider"),
      description: t("msp.successfullyJoinedAsAnManagedServiceProvider"),
      loadingMessage: t("msp.processingYourInvitation"),
      promise,
    });
    return promise;
  };

  const redirectTo = () => {
    if (isMSPAccount) {
      router.push("/tenants");
    } else {
      router.push("/peers");
    }
  };

  const isDisabled = !isOwner || isMspInfoLoading || isMSPAccount;

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent
        maxWidthClass={"max-w-sm relative"}
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <GradientFadedBackground />
        <div className={"flex items-center justify-center flex-col gap-2 px-8"}>
          <div
            className={
              "bg-nb-gray-900 rounded-full h-11 w-11 flex items-center justify-center mb-2"
            }
          >
            <NetBirdIcon size={24} className={"shrink-0"} />
          </div>

          <div className={"text-xl font-medium text-center max-w-xs mb-1"}>
            {t("msp.netBirdInvitesYouToJoinAsAnManagedServiceProvider")}
          </div>
          <div className={"text-sm text-nb-gray-300 text-center"}>
            {t("msp.youWillGetAccessToTheNetBirdMSPPortalWhere")}
          </div>
          {!isOwner && !isMSPAccount && (
            <Callout
              icon={
                <LockIcon size={14} className={"shrink-0 relative top-[3px]"} />
              }
              className={"text-xs mt-3"}
            >
              {t("msp.onlyTheOwnerOfTheAccountCanAcceptThisInvitation")}
            </Callout>
          )}
          {isMSPAccount && !calledOnce && (
            <Callout className={"text-xs mt-3 w-full"}>
              {t("msp.theInvitationHasAlreadyBeenAccepted")}
            </Callout>
          )}
        </div>

        <ModalFooter separator={false} className={"gap-x-2 mt-1"}>
          <Button
            className={"w-full"}
            variant={"secondary"}
            onClick={redirectTo}
          >
            {declineButtonText}
          </Button>

          <Button
            autoFocus={true}
            className={"w-full"}
            variant={"primary"}
            disabled={isDisabled}
            onClick={acceptInvitation}
          >
            {t("msp.accept")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const Redirect = () => {
  useRedirect("/peers");
  return <FullScreenLoading fullScreen={false} />;
};
