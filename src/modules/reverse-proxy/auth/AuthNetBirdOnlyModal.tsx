import Badge from "@components/Badge";
import Button from "@components/Button";
import { Modal, ModalClose, ModalContent } from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { CircleUser } from "lucide-react";
import React, { useState } from "react";
import { useUsers } from "@/contexts/UsersProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group } from "@/interfaces/Group";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGroups: Group[];
  isEnabled: boolean;
  onSave: (groups: Group[]) => void;
  onRemove: () => void;
};

export default function AuthNetBirdOnlyModal({
  open,
  onOpenChange,
  currentGroups,
  isEnabled,
  onSave,
  onRemove,
}: Readonly<Props>) {
  const t = useTranslations();
  const { users } = useUsers();
  const [groups, setGroups] = useState<Group[]>(currentGroups);
  const isEditing = isEnabled;

  const handleSave = () => {
    onOpenChange(false);
    onSave(groups);
  };

  const handleRemove = () => {
    onOpenChange(false);
    setGroups([]);
    onRemove();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass="max-w-xl">
        <ModalHeader
          title={t("reverseProxy.netBirdOnlyAccess")}
          description={t("reverseProxy.reachableFromPeersInSelectedGroupsOnly")}
        />

        <GradientFadedBackground />

        <div className="px-8">
          <PeerGroupSelector
            values={groups}
            onChange={setGroups}
            placeholder={
              <div className={"flex items-center gap-2"}>
                <Badge className={"py-[3px]"} variant={"gray-ghost"}>
                  <CircleUser size={12} />
                  {t("reverseProxy.pickGroups")}
                </Badge>
                {t("reverseProxy.selectAccessGroups")}
              </div>
            }
            users={users}
          />
          <div className="flex gap-3 w-full justify-between mt-6">
            {isEditing ? (
              <>
                <Button variant="danger-text" onClick={handleRemove}>
                  {t("common.remove")}
                </Button>
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">{t("common.cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={groups.length === 0}
                  >
                    {t("common.save")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex gap-3">
                  <ModalClose asChild>
                    <Button variant="secondary">{t("common.cancel")}</Button>
                  </ModalClose>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={groups.length === 0}
                  >
                    {t("common.enable")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
