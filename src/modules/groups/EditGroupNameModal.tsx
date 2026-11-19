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
import { useTranslations } from "@/i18n/LocaleProvider";

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
  const t = useTranslations();
  const [name, setName] = useState(initialName);
  const { groups } = useGroups();
  const [error, setError] = useState("");

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
      setError(t("groups.nameAlreadyExists"));
    } else {
      setError("");
    }
    setName(newName);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <ModalHeader
          title={t("groups.rename")}
          description={t("groups.renameDescription")}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              data-testid="group-name-input"
              placeholder={t("groups.namePlaceholder")}
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
                {t("common.cancel")}
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              className={"w-full"}
              data-testid="save-group-name"
              onClick={() => onSuccess(name)}
              disabled={isDisabled}
              type={"submit"}
            >
              {t("common.save")}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
