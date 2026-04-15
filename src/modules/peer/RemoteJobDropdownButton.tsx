import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import SquareIcon from "@components/SquareIcon";
import { BugPlay, ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { CreateDebugJobModalContent } from "../jobs/CreateDebugJobModal";

export const RemoteJobDropdownButton = () => {
  const [modal, setModal] = useState(false);
  const { peer } = usePeer();
  const { permission } = usePermissions();
  const { t } = useI18n();
  const isConnected = peer?.connected;
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
          <Button variant={"primary"} disabled={disabled}>
            {t("remoteJobs.run")}
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end" sideOffset={10}>
          {!isConnected && (
            <>
              <div
                className={
                  "text-xs flex items-center w-full justify-center max-w-xs px-3 py-3 text-nb-gray-200 font-light"
                }
              >
                <div>
                  {t("remoteJobs.peer")}{" "}
                  <span className={"text-white font-medium"}>{peer.name}</span>{" "}
                  {t("remoteJobs.offlineMessage")}
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => setModal(true)}
            disabled={disabled || !isConnected}
          >
            <div className={"flex gap-3 items-center justify-center pr-3"}>
              <SquareIcon
                icon={<BugPlay size={14} />}
                margin={""}
                size={"small"}
              />
              <div className={"flex flex-col text-left"}>
                <div className={"text-left text-white"}>
                  {t("jobs.debugBundle")}
                </div>
                <div className={"text-xs"}>{t("remoteJobs.debugBundleHelp")}</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
