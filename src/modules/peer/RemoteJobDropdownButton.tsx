import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import SquareIcon from "@components/SquareIcon";
import { Bug, ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { CreateDebugJobModalContent } from "../jobs/CreateDebugJobModal";

export const RemoteJobDropdownButton = () => {
  const [modal, setModal] = useState(false);
  const { peer } = usePeer();
  const { permission } = usePermissions();
  const disabled = !permission.peers.delete;

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        <CreateDebugJobModalContent
          peerID={peer.id!}
          onSuccess={() => setModal(false)}
        />
      </Modal>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Button variant={"primary"} disabled={disabled} >
            Create Job
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end" sideOffset={10}>
          <DropdownMenuItem
            onClick={() => setModal(true)}
            disabled={disabled}
          >
            <div className={"flex gap-3 items-center justify-center pr-3"}>
              <SquareIcon
                icon={<Bug size={14} />}
                margin={""}
              />
              <div className={"flex flex-col text-left"}>
                <div className={"text-left text-white"}>Debug Bundle</div>
                <div className={"text-xs"}>
                  Collect debug information for troubleshooting
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

}
