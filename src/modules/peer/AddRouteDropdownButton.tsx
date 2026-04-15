import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import SquareIcon from "@components/SquareIcon";
import { ChevronDown, PlusCircle } from "lucide-react";
import React, { useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import RouteAddRoutingPeerModal from "@/modules/routes/RouteAddRoutingPeerModal";
import { RouteModalContent } from "@/modules/routes/RouteModal";

export default function AddRouteDropdownButton() {
  const [modal, setModal] = useState(false);
  const [existingNetworkModal, setExistingNetworkModal] = useState(false);
  const { peer } = usePeer();
  const { permission } = usePermissions();
  const { t } = useI18n();

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        {modal && (
          <RouteModalContent onSuccess={() => setModal(false)} peer={peer} />
        )}
      </Modal>

      <RouteAddRoutingPeerModal
        peer={peer}
        modal={existingNetworkModal}
        setModal={setExistingNetworkModal}
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Button variant={"primary"}>
            {t("routeActions.addRoute")}
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end" sideOffset={10}>
          <DropdownMenuItem
            onClick={() => setModal(true)}
            disabled={!permission.routes.create}
          >
            <div className={"flex gap-3 items-center justify-center pr-3"}>
              <SquareIcon
                icon={<PlusCircle size={14} />}
                color={"green"}
                margin={""}
                size={"small"}
              />
              <div className={"flex flex-col text-left"}>
                <div className={"text-left text-white"}>
                  {t("routeActions.newNetworkRoute")}
                </div>
                <div className={"text-xs"}>{t("routeActions.newNetworkRouteHelp")}</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setExistingNetworkModal(true)}
            disabled={!permission.routes.update || !permission.peers.update}
          >
            <div className={"flex gap-3 items-center justify-center pr-3"}>
              <SquareIcon
                icon={
                  <NetworkRoutesIcon size={14} className={"fill-netbird"} />
                }
                color={"netbird"}
                margin={""}
                size={"small"}
              />
              <div className={"flex flex-col text-left"}>
                <div className={"text-left text-white"}>
                  {t("routeActions.existingNetwork")}
                </div>
                <div className={"text-xs"}>{t("routeActions.existingNetworkHelp")}</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
