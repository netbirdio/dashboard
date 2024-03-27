import Button from "@components/Button";
import { Modal } from "@components/modal/Modal";
import { IconCirclePlus } from "@tabler/icons-react";
import * as React from "react";
import { useState } from "react";
import { Peer } from "@/interfaces/Peer";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";
import { RouteModalContent } from "@/modules/routes/RouteModal";

type Props = {
  peer?: Peer;
};
export const AddExitNodeButton = ({ peer }: Props) => {
  const [modal, setModal] = useState(false);

  return (
    <>
      <ExitNodeHelpTooltip>
        <Button variant={"secondary"} onClick={() => setModal(true)}>
          <IconCirclePlus size={16} />
          Add Exit Node
        </Button>
      </ExitNodeHelpTooltip>
      <Modal open={modal} onOpenChange={setModal}>
        {modal && (
          <RouteModalContent
            onSuccess={() => setModal(false)}
            peer={peer}
            exitNode={true}
          />
        )}
      </Modal>
    </>
  );
};
