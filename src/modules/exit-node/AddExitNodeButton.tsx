import Button from "@components/Button";
import { Modal } from "@components/modal/Modal";
import { IconCirclePlus, IconDirectionSign } from "@tabler/icons-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { ExitNodeHelpTooltip } from "@/modules/exit-node/ExitNodeHelpTooltip";
import { RouteModalContent } from "@/modules/routes/RouteModal";

type Props = {
  peer?: Peer;
  firstTime?: boolean;
  distributionGroups?: Group[];
};
export const AddExitNodeButton = ({
  peer,
  firstTime = false,
  distributionGroups,
}: Props) => {
  const [modal, setModal] = useState(false);
  const { permission } = usePermissions();
  const { t } = useI18n();

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
              {t("exitNodes.add")}
            </>
          ) : (
            <>
              <IconDirectionSign size={16} className={"text-yellow-400"} />
              {t("exitNodes.setup")}
            </>
          )}
        </Button>
      </ExitNodeHelpTooltip>
      <Modal open={modal} onOpenChange={setModal}>
        {modal && (
          <RouteModalContent
            onSuccess={() => setModal(false)}
            peer={peer}
            distributionGroups={distributionGroups}
            isFirstExitNode={firstTime}
            exitNode={true}
          />
        )}
      </Modal>
    </>
  );
};
