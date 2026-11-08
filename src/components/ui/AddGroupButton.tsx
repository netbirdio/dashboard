import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import { ExternalLinkIcon, FolderGit2Icon, PlusCircle } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import { useApiCall } from "@/utils/api";
import ModalHeader from "../modal/ModalHeader";
import { notify } from "../Notification";
import Paragraph from "../Paragraph";
import Separator from "../Separator";

export const AddGroupButton = () => {
  const t = useTranslations('groups');
  const create = useApiCall<Group>("/groups", true).post;
  const { mutate } = useSWRConfig();
  const [name, setName] = useState<string>("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { permission } = usePermissions();

  const createGroup = () => {
    notify({
      title: t('create'),
      description: t('createSuccess', { name }),
      loadingMessage: t('creating'),
      promise: create({ name }).then((g) => {
        setOpen(false);
        setName("");
        mutate("/groups");
        router.push(`/group?id=${g?.id}`);
      }),
    });
  };

  return (
    permission?.groups?.create && (
      <Modal open={open} onOpenChange={setOpen}>
        <ModalTrigger asChild>
          <Button
            variant={"primary"}
            size={"sm"}
            className={"ml-auto h-[42px]"}
            data-testid="open-create-group"
          >
            <PlusCircle size={16} />
            {t('create')}
          </Button>
        </ModalTrigger>
        <ModalContent maxWidthClass={"max-w-xl"}>
          <ModalHeader
            icon={<FolderGit2Icon size={18} />}
            title={t('create')}
            description={t('createDescription')}
            color="netbird"
          />
          <Separator />
          <div className={"px-8 flex-col flex gap-6 py-6"}>
            <div>
              <Label>{t('name')}</Label>
              <HelpText>
                {t('nameHelp')}
              </HelpText>
              <Input
                tabIndex={0}
data-testid="group-name-input"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                {t('learnMore')}
                <InlineLink
                  href={"https://docs.netbird.io/how-to/manage-network-access"}
                  target={"_blank"}
                >
                  {t('title')}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>{t('cancel')}</Button>
              </ModalClose>

              <Button
                variant={"primary"}
                data-testid={"create-group"}
                disabled={!name}
                onClick={createGroup}
              >
                <PlusCircle size={16} />
                {t('create')}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  );
};
