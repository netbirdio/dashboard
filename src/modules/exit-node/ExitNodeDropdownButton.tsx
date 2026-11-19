import { DropdownMenuItem } from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import { IconCirclePlus, IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import { useHasExitNodes } from "@/modules/exit-node/useHasExitNodes";
import { RouteModalContent } from "@/modules/routes/RouteModal";

type Props = {
  peer: Peer;
};

export const ExitNodeDropdownButton = ({ peer }: Props) => {
  const t = useTranslations();
  const [modal, setModal] = useState(false);
  const exitNodeInfo = useHasExitNodes(peer);
  const { permission } = usePermissions();

  return (
    <>
      <DropdownMenuItem
        onClick={() => setModal(true)}
        disabled={!permission.routes.create}
      >
        <div className={"flex gap-3 items-center w-full"}>
          {exitNodeInfo.hasExitNode ? (
            <>
              <IconCirclePlus size={14} className={"shrink-0"} />
              <div className={"flex justify-between items-center w-full"}>
                {t("exitNode.addExitNode")}
              </div>
            </>
          ) : (
            <>
              <IconDirectionSign
                size={14}
                className={"shrink-0 text-yellow-400"}
              />
              <div className={"flex justify-between items-center w-full"}>
                {t("exitNode.setupExitNode")}
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
  );
};
