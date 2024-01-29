"use client";

import { Modal } from "@components/modal/Modal";
import { useEffect, useState } from "react";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

export default function UnauthenticatedInstallModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <Modal onOpenChange={() => null} open={open}>
      <SetupModal showClose={false} />
    </Modal>
  );
}
