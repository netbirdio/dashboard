import { Modal, ModalContent, ModalTrigger } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import PostureCheckTable from "@/modules/access-control/posture-checks/table/PostureCheckTable";

type Props = {
  children: React.ReactNode;
  onAdd: (checks: PostureCheck[]) => void;
};
export const PostureChecksSelectionModal = ({ children, onAdd }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <ModalTrigger asChild={true}>{children}</ModalTrigger>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-2xl")}
        className={"pb-0"}
        showClose={false}
      >
        <PostureCheckTable
          onAdd={(checks) => {
            onAdd(checks);
            setOpen(false);
          }}
        />
      </ModalContent>
    </Modal>
  );
};
