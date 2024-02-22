import { Modal, ModalContent } from "@components/modal/Modal";
import { cn } from "@utils/helpers";
import * as React from "react";
import { PostureCheck } from "@/interfaces/PostureCheck";
import PostureCheckBrowseTable from "@/modules/posture-checks/table/PostureCheckBrowseTable";

type Props = {
  onSuccess: (checks: PostureCheck[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export const PostureCheckBrowseModal = ({
  onSuccess,
  open,
  onOpenChange,
}: Props) => {
  return (
    <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-2xl")}
        className={"pb-0"}
        showClose={false}
      >
        <PostureCheckBrowseTable
          onAdd={(checks) => {
            onSuccess(checks);
            onOpenChange(false);
          }}
        />
      </ModalContent>
    </Modal>
  );
};
