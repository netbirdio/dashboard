"use client";

import Button from "@components/Button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Separator from "@components/Separator";
import { ShieldOffIcon } from "lucide-react";
import React, { useState } from "react";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";
import type { DeviceCert } from "@/interfaces/DeviceSecurity";

type Props = {
  device: DeviceCert;
  children: React.ReactNode;
};

function truncate(value: string, length = 20): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}...`;
}

export default function RevokeDeviceModal({ device, children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { revokeDevice } = useDeviceSecurity();

  const handleRevoke = async () => {
    notify({
      title: "Revoking device certificate",
      description: "Device certificate was successfully revoked",
      promise: revokeDevice(device.id).then(() => {
        setOpen(false);
      }),
      loadingMessage: "Revoking device certificate...",
    });
  };

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{children}</ModalTrigger>
      <ModalContent maxWidthClass="max-w-md">
        <ModalHeader
          icon={<ShieldOffIcon />}
          title="Revoke Device Certificate"
          description="This action cannot be undone. The device will no longer be able to authenticate using this certificate."
          color="red"
        />
        <Separator />
        <div className="px-8 py-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-nb-gray-400 uppercase tracking-wide">
              WireGuard Public Key
            </span>
            <span
              className="font-mono text-sm text-nb-gray-200"
              title={device.wg_public_key}
            >
              {truncate(device.wg_public_key, 32)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-nb-gray-400 uppercase tracking-wide">
              Serial Number
            </span>
            <span
              className="font-mono text-sm text-nb-gray-200"
              title={device.serial}
            >
              {truncate(device.serial, 32)}
            </span>
          </div>
        </div>
        <ModalFooter className="items-center">
          <div className="flex gap-3 w-full justify-end">
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button variant="danger" onClick={handleRevoke}>
              <ShieldOffIcon size={16} />
              Revoke
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
