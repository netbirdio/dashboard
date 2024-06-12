import { DropdownMenuItem } from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconCirclePlus, IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { useState } from "react";
import RoutesProvider from "@/contexts/RoutesProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";
import { RouteModalContent } from "@/modules/routes/RouteModal";

type Props = {
  peer: Peer;
};

export const ExitNodeDropdownButton = ({ peer }: Props) => {
  const [modal, setModal] = useState(false);
  const isLinux = getOperatingSystem(peer.os) === OperatingSystem.LINUX;
  const hasExitNodes = useHasExitNodes(peer);

  return isLinux ? (
    <>
      <DropdownMenuItem onClick={() => setModal(true)}>
        <div className={"flex gap-3 items-center w-full"}>
          {hasExitNodes ? (
            <>
              <IconCirclePlus size={14} className={"shrink-0"} />
              <div className={"flex justify-between items-center w-full"}>
                Add Exit Node
              </div>
            </>
          ) : (
            <>
              <IconDirectionSign
                size={14}
                className={"shrink-0 text-yellow-400"}
              />
              <div className={"flex justify-between items-center w-full"}>
                Set Up Exit Node
              </div>
            </>
          )}
        </div>
      </DropdownMenuItem>
      <Modal open={modal} onOpenChange={setModal}>
        {modal && (
          <RoutesProvider>
            <RouteModalContent
              onSuccess={() => setModal(false)}
              peer={peer}
              exitNode={true}
            />
          </RoutesProvider>
        )}
      </Modal>
    </>
  ) : null;
};
