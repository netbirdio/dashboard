import { Modal, ModalContent, ModalTrigger } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import PostureChecksTable from "@/modules/access-control/posture-checks/PostureChecksTable";

type Props = {
  children: React.ReactNode;
};
export const PostureChecksSelectionModal = ({ children }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <ModalTrigger asChild={true}>{children}</ModalTrigger>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-4xl")}
        className={"pb-0"}
        showClose={false}
      >
        <PostureChecksTable />
      </ModalContent>
    </Modal>
  );
};
