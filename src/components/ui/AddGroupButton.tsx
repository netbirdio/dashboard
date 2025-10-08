import { Group } from "@/interfaces/Group";
import { useApiCall } from "@/utils/api";
import { useState } from "react";
import ModalHeader from "../modal/ModalHeader";
import { ExternalLinkIcon, FolderGit2Icon, PlusCircle } from "lucide-react";
import Separator from "../Separator";
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
  ModalTrigger
} from "@components/modal/Modal";
import Paragraph from "../Paragraph";
import { notify } from "../Notification";
import { useSWRConfig } from "swr";

export const AddGroupButton = () => {
  const create = useApiCall<Group>("/groups").post;
  const { mutate } = useSWRConfig();
  const [name, setName] = useState<string>("");
  const [open, setOpen] = useState(false)

  const createGroup = () => {
    notify({
      title: name,
      description: "Group created successfully.",
      loadingMessage: "Creating network...",
      promise: create({ name }).then(() => {
        setOpen(false)
        setName("")
        mutate("/groups");
      }),
    });
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant={"primary"} size={"sm"} className={"ml-auto"}>
          <PlusCircle size={16} />
          Add Group
        </Button>
      </ModalTrigger>
      <ModalContent maxWidthClass={"max-w-xl"}>
        <ModalHeader
          icon={<FolderGit2Icon size={20} />}
          title="New Group"
          description="Create New Group"
          color="netbird"
        />
        <Separator />
        <div className={"px-8 flex-col flex gap-6 py-6"}>
          <div>
            <Label>Group Name</Label>
            <HelpText>Provide a name for the group.</HelpText>
            <Input
              tabIndex={0}
              placeholder={"e.g., Dev"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                href={"https://docs.netbird.io/how-to/manage-network-access"}
                target={"_blank"}
              >
                Groups
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>

            <Button
              variant={"primary"}
              data-cy={"submit-route"}
              disabled={!name}
              onClick={createGroup}
            >
              <>
                <PlusCircle size={16} />
                Add Group
              </>
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
