import { Modal, ModalContent, ModalTrigger } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { cn } from "@utils/helpers";
import { ShieldCheck } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import PostureCheckTable from "@/modules/access-control/posture-checks/table/PostureCheckTable";

type Props = {
  children: React.ReactNode;
};
export const PostureChecksSelectionModal = ({ children }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
      <ModalTrigger asChild={true}>{children}</ModalTrigger>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-3xl")}
        className={"pb-0"}
        showClose={false}
      >
        <ModalHeader
          icon={<ShieldCheck size={18} />}
          title={"Posture Checks"}
          description={
            "Select the posture checks that you want to add to the policy."
          }
          color={"blue"}
        />
        <PostureCheckTable />
      </ModalContent>
    </Modal>
  );
};
