import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";
import { IconMailForward } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import { MailIcon, User2 } from "lucide-react";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import Avatar1 from "@/assets/avatars/009.jpg";
import Avatar2 from "@/assets/avatars/030.jpg";
import Avatar3 from "@/assets/avatars/063.jpg";
import Avatar4 from "@/assets/avatars/086.jpg";
import { Role, User } from "@/interfaces/User";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { UserRoleSelector } from "@/modules/users/UserRoleSelector";

type Props = {
  children: React.ReactNode;
};

export default function UserInviteModal({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
        <ModalTrigger asChild={true}>{children}</ModalTrigger>
        <UserInviteModalContent onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess: () => void;
};

export function UserInviteModalContent({ onSuccess }: ModalProps) {
  const userRequest = useApiCall<User>("/users");
  const { mutate } = useSWRConfig();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [selectedGroups, setSelectedGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: [],
    });

  const sendInvite = async () => {
    const groups = await saveGroups();
    const groupIds = groups.map((group) => group.id) as string[];
    notify({
      title: "User Invitation",
      description: `${name} was invited to join your network.`,
      promise: userRequest
        .post({
          name,
          email,
          role,
          auto_groups: groupIds,
          is_service_user: false,
        })
        .then(() => {
          onSuccess && onSuccess();
          mutate("/users?service_user=false");
        }),
      loadingMessage: "Sending invite...",
    });
  };
  const isValidEmail = useMemo(() => {
    return email.length > 0 && validator.isValidEmail(email);
  }, [email]);

  const isDisabled = useMemo(() => {
    return name.length === 0 || !isValidEmail;
  }, [name, isValidEmail]);

  return (
    <ModalContent maxWidthClass={"max-w-md relative"} showClose={true}>
      <GradientFadedBackground />
      <UserAvatars />

      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center mt-6"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>
          Invite User
        </h2>
        <Paragraph className={cn("text-sm text-center max-w-xs")}>
          Invite a user to your network and set their permissions.
        </Paragraph>
      </div>

      <div className={"px-8 py-3 flex flex-col gap-6 mt-4"}>
        <div className={"flex flex-col gap-4"}>
          <Input
            customPrefix={
              <div className={"flex items-center gap-2"}>
                <User2 size={16} className={"text-nb-gray-300"} />
              </div>
            }
            placeholder={"John Doe"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type={"email"}
            className={"w-full"}
            customPrefix={
              <div className={"flex items-center gap-2"}>
                <MailIcon size={16} className={"text-nb-gray-300"} />
              </div>
            }
            placeholder={"hello@netbird.io"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <UserRoleSelector
            value={role as Role}
            onChange={setRole}
            hideOwner={true}
          />
        </div>

        <div className={"mb-4"}>
          <Label>Auto-assigned groups</Label>
          <HelpText>
            Groups will be assigned to peers added by this user.
          </HelpText>
          <PeerGroupSelector
            onChange={setSelectedGroups}
            values={selectedGroups}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <Button
          variant={"primary"}
          className={"w-full"}
          disabled={isDisabled}
          onClick={sendInvite}
        >
          Send Invitation
          <IconMailForward size={16} />
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

function UserAvatars() {
  return (
    <div className={"flex items-center justify-center relative"}>
      <div
        className={
          "flex items-center justify-center absolute left-0 top-0 w-full h-full -z-10"
        }
      >
        <div
          className={
            "w-10 h-10 shrink-0 bg-netbird/20 rounded-full inline-flex animate-ping duration-3000"
          }
        />
      </div>
      <div
        className={
          "w-14 h-14 relative top-2 overflow-hidden -right-8 bg-nb-gray-950 rounded-full flex items-center justify-center border-4 border-nb-gray-950 outline-2 outline-netbird"
        }
      >
        <Image src={Avatar1} alt={"MS"} />
      </div>
      <div
        className={
          "w-14 h-14 relative top-1 overflow-hidden -right-4 bg-nb-gray-950 rounded-full flex items-center justify-center border-4 border-nb-gray-950 outline-2 outline-netbird"
        }
      >
        <Image src={Avatar2} alt={"MS"} />
      </div>

      <div
        className={
          "w-14 h-14 z-20 relative overflow-hidden bg-nb-gray-930 rounded-full flex items-center justify-center border-4 border-nb-gray-950"
        }
      >
        <User2 size={24} className={"text-netbird"} />
      </div>
      <div
        className={
          "w-14 h-14 relative overflow-hidden z-10 top-1 -left-4 bg-nb-gray-950 rounded-full flex items-center justify-center border-4 border-nb-gray-950"
        }
      >
        <Image src={Avatar3} alt={"MS"} />
      </div>
      <div
        className={
          "w-14 h-14 relative overflow-hidden z-0 top-2 -left-8 bg-nb-gray-950 rounded-full flex items-center justify-center border-4 border-nb-gray-950"
        }
      >
        <Image src={Avatar4} alt={"MS"} />
      </div>
    </div>
  );
}
