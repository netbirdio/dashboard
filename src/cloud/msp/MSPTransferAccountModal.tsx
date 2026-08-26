import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { useApiCall } from "@utils/api";
import { cn, generateColorFromString } from "@utils/helpers";
import {
  ArrowRightLeft,
  MonitorSmartphoneIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import netBirdLogo from "@/assets/netbird.svg";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { TenantDNSResponse, TenantStatus } from "@/cloud/msp/interfaces/Tenant";
import { useDialog } from "@/contexts/DialogProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";

export const MSPTransferAccountModal = () => {
  const { mspInfo } = useMSP();
  const { confirm } = useDialog();
  const { isOwner } = useLoggedInUser();
  const { mutate } = useSWRConfig();
  const tenantRequest = useApiCall<TenantDNSResponse>(
    "/integrations/msp/tenants",
    true,
  );

  const hasParent = mspInfo && Object.hasOwn(mspInfo, "parent_name");
  const isInvited = mspInfo?.status === TenantStatus.Invited;
  const tenantId = mspInfo?.id;

  const firstChar = mspInfo?.parent_name?.charAt(0);
  const color = generateColorFromString(mspInfo?.parent_name);
  const [open, setOpen] = useState(true);

  const grantAccess = async () => {
    const choice = await confirm({
      title: `Granting access to ${mspInfo?.parent_domain}?`,
      description: `Are you sure you want to grant access? This action cannot be undone.`,
      confirmText: "Grant Access",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    notify({
      title: `Granting access to ${mspInfo?.parent_domain}`,
      description: "Access has been successfully granted.",
      loadingMessage: "Granting access...",
      promise: tenantRequest
        .put(
          {
            value: "accept",
          },
          `/${tenantId}/invite`,
        )
        .finally(() => {
          setOpen(false);
          mutate("/integrations/msp");
        }),
    });
  };

  const deny = () => {
    notify({
      title: "Access request denied",
      description: "You have denied the access request.",
      loadingMessage: "Declining access...",
      promise: tenantRequest
        .put(
          {
            value: "decline",
          },
          `/${tenantId}/invite`,
        )
        .finally(() => {
          setOpen(false);
          mutate("/integrations/msp");
        }),
    });
  };

  const showModal = hasParent && isInvited;
  if (!showModal) return;

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
          <div className={"flex justify-center items-center gap-4 mt-2"}>
            <div
              className={
                "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
              }
            >
              <div
                className={cn(
                  "w-8 h-8 flex items-center shrink-0 rounded-[4px] justify-center text-xl font-medium text-white uppercase",
                )}
                style={{
                  color: color,
                }}
              >
                <span>{firstChar}</span>
              </div>
            </div>
            <div>
              <ArrowRightLeft size={24} className={"text-netbird"} />
            </div>
            <div
              className={
                "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
              }
            >
              <Image
                src={netBirdLogo}
                alt={"NetBird"}
                className={"rounded-[4px]"}
              />
            </div>
          </div>
          <div
            className={
              "mx-auto text-center flex flex-col items-center justify-center mt-6 z-[1] px-6"
            }
          >
            <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
              {mspInfo?.parent_owner_name
                ? mspInfo?.parent_owner_name + " from "
                : ""}
              <span>{mspInfo?.parent_name || mspInfo?.name}</span> is requesting
              access to your account
            </h2>
            <Paragraph
              className={cn("text-sm text-center max-w-[450px] px-4 mt-2")}
            >
              A Managed Service Provider (MSP) is requesting access to manage
              your account and all of its associated resources.
            </Paragraph>
            <div
              className={"bg-nb-gray-920 px-5 py-4 rounded-lg mt-4 text-left"}
            >
              <div className={"text-sm text-nb-gray-200 mb-2 text-left"}>
                Please review the request carefully before proceeding. Granting
                them access will allow them to:
              </div>
              <ul className="flex flex-col gap-1.5 mt-4 mb-1">
                <li className="flex items-center gap-2 text-sm text-nb-gray-200">
                  <SettingsIcon size={16} className={"text-netbird"} />
                  Manage your account, settings and configurations
                </li>
                <li className="flex items-center gap-2 text-sm text-nb-gray-200">
                  <MonitorSmartphoneIcon size={16} className={"text-netbird"} />
                  Manage all devices and associated resources
                </li>
                <li className="flex items-center gap-2 text-sm text-nb-gray-200">
                  <UserIcon size={16} className={"text-netbird"} />
                  Manage all users, groups and permissions
                </li>
              </ul>
            </div>
            <div className={"flex gap-4 items-center mt-6 w-full"}>
              <Button className={"w-full"} variant={"secondary"} onClick={deny}>
                Deny
              </Button>
              <Button
                className={"w-full"}
                variant={"danger"}
                onClick={grantAccess}
              >
                Grant Access
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    )
  );
};
