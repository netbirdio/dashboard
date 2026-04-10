"use client";

import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
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
import { Textarea } from "@components/Textarea";
import { ShieldCheckIcon, PlusCircle } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useDeviceSecurity } from "@/contexts/DeviceSecurityProvider";

const PEM_HEADER = "-----BEGIN CERTIFICATE-----";

type Props = {
  children: React.ReactNode;
};

export default function AddTrustedCAModal({ children }: Readonly<Props>) {
  const [open, setOpen] = useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <ModalTrigger asChild>{children}</ModalTrigger>
      <AddTrustedCAModalContent onSuccess={() => setOpen(false)} />
    </Modal>
  );
}

type ContentProps = {
  onSuccess: () => void;
};

function AddTrustedCAModalContent({ onSuccess }: Readonly<ContentProps>) {
  const { addTrustedCA } = useDeviceSecurity();

  const [name, setName] = useState("");
  const [pem, setPem] = useState("");

  const pemError = useMemo(() => {
    const trimmed = pem.trim();
    if (trimmed.length === 0) return undefined;
    if (!trimmed.startsWith(PEM_HEADER)) {
      return `PEM certificate must start with "${PEM_HEADER}"`;
    }
    return undefined;
  }, [pem]);

  const isDisabled = useMemo(() => {
    return (
      name.trim().length === 0 ||
      pem.trim().length === 0 ||
      pemError !== undefined
    );
  }, [name, pem, pemError]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedPem = pem.trim();

    notify({
      title: "Adding trusted CA",
      description: `"${trimmedName}" was added successfully`,
      promise: addTrustedCA(trimmedName, trimmedPem).then(() => {
        onSuccess();
      }),
      loadingMessage: "Adding trusted CA...",
    });
  };

  return (
    <ModalContent maxWidthClass="max-w-lg">
      <ModalHeader
        icon={<ShieldCheckIcon />}
        title="Add Trusted CA"
        description="Upload a trusted Certificate Authority to authenticate devices"
        color="netbird"
      />

      <Separator />

      <div className="px-8 py-6 flex flex-col gap-6">
        <div>
          <Label>Name</Label>
          <HelpText>A descriptive name for this Certificate Authority</HelpText>
          <Input
            placeholder="e.g., Corporate Root CA"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label>PEM Certificate</Label>
          <HelpText>
            Paste the PEM-encoded certificate. Must begin with{" "}
            <code className="text-xs">{PEM_HEADER}</code>
          </HelpText>
          <Textarea
            placeholder={`${PEM_HEADER}\n...\n-----END CERTIFICATE-----`}
            value={pem}
            rows={8}
            onChange={(e) => setPem(e.target.value)}
            error={pemError}
          />
        </div>
      </div>

      <ModalFooter className="items-center">
        <div className="flex gap-3 w-full justify-end">
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            <PlusCircle size={16} />
            Add CA
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
