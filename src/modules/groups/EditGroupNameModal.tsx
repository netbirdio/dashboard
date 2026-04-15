"use client";

import Button from "@components/Button";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { trim } from "lodash";
import * as React from "react";
import { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  initialName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (name: string) => void;
};
export const EditGroupNameModal = ({
  initialName,
  onOpenChange,
  open,
  onSuccess,
}: Props) => {
  const [name, setName] = useState(initialName);
  const { groups } = useGroups();
  const [error, setError] = useState("");
  const { t } = useI18n();

  const isDisabled = useMemo(() => {
    if (name === initialName) return true;
    if (error !== "") return true;
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name, initialName, error]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const findGroup = groups?.find((g) => g.name === newName);
    if (findGroup) {
      setError(t("groups.renameExists"));
    } else {
      setError("");
    }
    setName(newName);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <ModalHeader
          title={t("groups.renameTitle")}
          description={t("groups.renameDescription")}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              placeholder={t("groups.renamePlaceholder")}
              value={name}
              onChange={handleNameChange}
              error={error}
            />
          </div>
        </div>

        <ModalFooter className={"items-center"} separator={false}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} className={"w-full"}>
                {t("actions.cancel")}
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={() => onSuccess(name)}
              disabled={isDisabled}
              type={"submit"}
            >
              {t("actions.save")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
