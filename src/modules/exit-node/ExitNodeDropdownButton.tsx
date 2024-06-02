import { DropdownMenuItem } from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { useState } from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { RouteModalContent } from "@/modules/routes/RouteModal";

type Props = {
  peer: Peer;
};

export const ExitNodeDropdownButton = ({ peer }: Props) => {
  const [modal, setModal] = useState(false);
  const isLinux = getOperatingSystem(peer.os) === OperatingSystem.LINUX;

  return isLinux ? (
    <>
      <DropdownMenuItem onClick={() => setModal(true)}>
        <div className={"flex gap-3 items-center w-full"}>
          <IconDirectionSign size={14} className={"shrink-0"} />
          <div className={"flex justify-between items-center w-full"}>
            Add Exit Node
          </div>
        </div>
      </DropdownMenuItem>
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
  ) : null;
};
