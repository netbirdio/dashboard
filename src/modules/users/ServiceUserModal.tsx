"use client";

import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import { IconSettings2 } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { ExternalLinkIcon, PlusCircle, User2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { Role, User } from "@/interfaces/User";
import { UserRoleSelector } from "@/modules/users/UserRoleSelector";

type Props = {
  children: React.ReactNode;
};

export default function ServiceUserModal({ children }: Props) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        <ModalTrigger asChild>{children}</ModalTrigger>
        <ServiceUserModalContent onSuccess={() => setModal(false)} />
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: () => void;
};

export function ServiceUserModalContent({ onSuccess }: ModalProps) {
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");

  const create = async () => {
    notify({
      title: "Service user created",
      description: `${name} was successfully created.`,
      promise: userRequest
        .post({
          name,
          role,
          auto_groups: [],
          is_service_user: true,
        })
        .then(() => {
          onSuccess && onSuccess();
          mutate("/users?service_user=true");
        }),
      loadingMessage: "Creating service user...",
    });
  };

  const isDisabled = useMemo(() => {
    return name.length === 0;
  }, [name]);

  return (
    <ModalContent maxWidthClass={"max-w-lg"}>
      <ModalHeader
        icon={<IconSettings2 />}
        title={"Create Service User"}
        description={
          "Service users are non-login users that are not associated with any specific person."
        }
        color={"netbird"}
      />

      <Separator />

      <div className={"px-8 py-6 flex flex-col gap-8"}>
        <div className={"grid grid-cols-3 gap-4"}>
          <div className={"col-span-2"}>
            <Input
              customPrefix={
                <div className={"flex items-center gap-2"}>
                  <User2 size={16} className={"text-nb-gray-300"} />
                </div>
              }
              placeholder={"John Doe"}
              value={name}
              data-cy={"service-user-name"}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <UserRoleSelector
            value={role as Role}
            onChange={setRole}
            hideOwner={true}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={"https://docs.netbird.io/how-to/access-netbird-public-api"}
              target={"_blank"}
            >
              Service Users
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
            disabled={isDisabled}
            onClick={create}
            data-cy={"create-service-user"}
          >
            <PlusCircle size={16} />
            Create Service User
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
