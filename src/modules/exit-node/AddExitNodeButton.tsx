import Button from "@components/Button";
import { Modal } from "@components/modal/Modal";
import { IconCirclePlus, IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Peer } from "@/interfaces/Peer";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";
import { RouteModalContent } from "@/modules/routes/RouteModal";

type Props = {
  peer?: Peer;
  firstTime?: boolean;
};
export const AddExitNodeButton = ({ peer, firstTime = false }: Props) => {
  const [modal, setModal] = useState(false);
  const { permission } = usePermissions();

  return (
    <>
      <ExitNodeHelpTooltip>
        <Button
          variant={"secondary"}
          onClick={() => setModal(true)}
          disabled={!permission.routes.create}
        >
          {!firstTime ? (
            <>
              <IconCirclePlus size={16} />
              Add Exit Node
            </>
          ) : (
            <>
              <IconDirectionSign size={16} className={"text-yellow-400"} />
              Set Up Exit Node
            </>
          )}
        </Button>
      </ExitNodeHelpTooltip>
      <Modal open={modal} onOpenChange={setModal}>
        {modal && (
          <RouteModalContent
            onSuccess={() => setModal(false)}
            peer={peer}
            isFirstExitNode={firstTime}
            exitNode={true}
          />
        )}
      </Modal>
    </>
  );
};
