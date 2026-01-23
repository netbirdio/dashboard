import Button from "@components/Button";
import Code from "@components/Code";
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
import { SegmentedTabs } from "@components/SegmentedTabs";
import { IconMailForward, IconLink, IconUserPlus } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import { CopyIcon, MailIcon, User2 } from "lucide-react";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import Avatar1 from "@/assets/avatars/009.jpg";
import Avatar2 from "@/assets/avatars/030.jpg";
import Avatar3 from "@/assets/avatars/063.jpg";
import Avatar4 from "@/assets/avatars/086.jpg";
import { Group } from "@/interfaces/Group";
import { Role, User, UserInviteCreateResponse } from "@/interfaces/User";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { UserRoleSelector } from "@/modules/users/UserRoleSelector";
import { isNetBirdHosted } from "@utils/netbird";

type UserCreationMode = "create" | "invite";

type Props = {
  children: React.ReactNode;
  groups?: Group[];
};

const passwordCopyMessage = "Password was copied to your clipboard!";
const inviteLinkCopyMessage = "Invite link was copied to your clipboard!";

type SuccessData =
  | { type: "password"; user: User }
  | { type: "invite"; invite: UserInviteCreateResponse };

export default function UserInviteModal({ children, groups }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const { mutate } = useSWRConfig();

  const isPasswordSuccess = successData?.type === "password";
  const isInviteSuccess = successData?.type === "invite";

  const getInviteFullUrl = () => {
    if (!isInviteSuccess) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite?token=${successData.invite.invite_link}`;
  };

  const getCopyValue = () => {
    if (successData?.type === "password") return successData.user.password;
    if (successData?.type === "invite") return getInviteFullUrl();
    return undefined;
  };
  const [, copyToClipboard] = useCopyToClipboard(getCopyValue());

  const handleUserCreated = (user: User) => {
    if (user.password) {
      setSuccessData({ type: "password", user });
      setSuccessModal(true);
    } else {
      setOpen(false);
    }
    setTimeout(() => {
      mutate("/users?service_user=false");
    }, 1000);
  };

  const handleInviteCreated = (invite: UserInviteCreateResponse) => {
    setSuccessData({ type: "invite", invite });
    setSuccessModal(true);
    setTimeout(() => {
      mutate("/users?service_user=false");
      mutate("/users/invites");
    }, 1000);
  };

  const handleCopyAndClose = () => {
    const message =
      successData?.type === "password"
        ? passwordCopyMessage
        : inviteLinkCopyMessage;
    copyToClipboard(message).then(() => {
      setSuccessData(null);
      setSuccessModal(false);
      setOpen(false);
    });
  };

  return (
    <>
      <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
        <ModalTrigger asChild={true}>{children}</ModalTrigger>
        <UserInviteModalContent
          onUserCreated={handleUserCreated}
          onInviteCreated={handleInviteCreated}
          groups={groups}
        />
      </Modal>

      <Modal
        open={successModal}
        onOpenChange={(open) => {
          if (!open) {
            setSuccessData(null);
          }
          setSuccessModal(open);
          setOpen(open);
        }}
      >
        <ModalContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          maxWidthClass={isInviteSuccess ? "max-w-xl" : "max-w-md"}
          className={"mt-20"}
          showClose={false}
        >
          <div className={"pb-6 px-8"}>
            <div className={"flex flex-col items-center justify-center gap-3"}>
              <div>
                <h2 className={"text-2xl text-center mb-2"}>
                  {isPasswordSuccess && "User created successfully!"}
                  {isInviteSuccess && "Invite link created!"}
                </h2>
                <Paragraph className={"mt-0 text-sm text-center"}>
                  {isPasswordSuccess &&
                    "This password will not be shown again, so be sure to copy it and store in a secure location."}
                  {isInviteSuccess &&
                    "Share this link with the user. They will be able to set their own password."}
                </Paragraph>
              </div>
            </div>
          </div>

          <div className={"px-8 pb-6"}>
            <Code
              message={
                isPasswordSuccess ? passwordCopyMessage : inviteLinkCopyMessage
              }
              codeToCopy={getCopyValue()}
            >
              {isPasswordSuccess && (
                <Code.Line>{successData.user.password}</Code.Line>
              )}
              {isInviteSuccess && (
                <span className="break-all whitespace-normal block">
                  {getInviteFullUrl()}
                </span>
              )}
            </Code>
            {isInviteSuccess && (
              <Paragraph className={"mt-3 text-xs text-nb-gray-400 text-center"}>
                Expires on{" "}
                {new Date(successData.invite.invite_expires_at).toLocaleString()}
              </Paragraph>
            )}
          </div>
          <ModalFooter className={"items-center"}>
            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={handleCopyAndClose}
            >
              <CopyIcon size={14} />
              Copy & Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

type ModalProps = {
  onUserCreated: (user: User) => void;
  onInviteCreated: (invite: UserInviteCreateResponse) => void;
  groups?: Group[];
};

export function UserInviteModalContent({
  onUserCreated,
  onInviteCreated,
  groups = [],
}: Readonly<ModalProps>) {
  const userRequest = useApiCall<User>("/users");
  const inviteRequest = useApiCall<UserInviteCreateResponse>("/users/invites");
  const { mutate } = useSWRConfig();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [selectedGroups, setSelectedGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: groups,
    });

  const isCloud = isNetBirdHosted();
  const [mode, setMode] = useState<UserCreationMode>("invite");

  const createUser = async () => {
    const groups = await saveGroups();
    const groupIds = groups.map((group) => group.id) as string[];
    notify({
      title: "Create User",
      description: `Creating user account for ${name}...`,
      promise: userRequest
        .post({
          name,
          email,
          role,
          auto_groups: groupIds,
          is_service_user: false,
        })
        .then((user) => {
          mutate("/users?service_user=false");
          onUserCreated && onUserCreated(user);
        }),
      loadingMessage: "Creating user...",
    });
  };

  const createInvite = async () => {
    const groups = await saveGroups();
    const groupIds = groups.map((group) => group.id) as string[];
    notify({
      title: "Create Invite",
      description: `Creating invite link for ${name}...`,
      promise: inviteRequest
        .post({
          name,
          email,
          role,
          auto_groups: groupIds,
        })
        .then((invite) => {
          mutate("/users?service_user=false");
          onInviteCreated && onInviteCreated(invite);
        }),
      loadingMessage: "Creating invite...",
    });
  };

  const handleSubmit = async () => {
    if (isCloud) {
      await createUser();
    } else {
      if (mode === "create") {
        await createUser();
      } else {
        await createInvite();
      }
    }
  };

  const isValidEmail = useMemo(() => {
    return email.length > 0 && validator.isValidEmail(email);
  }, [email]);

  const isDisabled = useMemo(() => {
    return name.length === 0 || !isValidEmail;
  }, [name, isValidEmail]);

  const getTitle = () => {
    if (isCloud) return "Invite User";
    return mode === "create" ? "Create User" : "Invite User";
  };

  const getDescription = () => {
    if (isCloud) return "Invite a user to your network and set their permissions.";
    if (mode === "create") {
      return "Create a NetBird user account with email and password.";
    }
    return "Generate an invite link that the user can use to set their own password.";
  };

  const getButtonText = () => {
    if (isCloud) return "Send Invitation";
    return mode === "create" ? "Create User" : "Create Invite Link";
  };

  const getButtonIcon = () => {
    if (isCloud) return <IconMailForward size={16} />;
    return mode === "create" ? (
      <IconUserPlus size={16} />
    ) : (
      <IconLink size={16} />
    );
  };

  return (
    <ModalContent maxWidthClass={"max-w-lg relative"} showClose={true}>
      <div
        className={
          "h-full w-full absolute left-0 top-0 rounded-md overflow-hidden z-0"
        }
      >
        <div
          className={
            "bg-gradient-to-b from-nb-gray-900/20 via-transparent to-transparent w-full h-full rounded-md"
          }
        ></div>
      </div>
      <UserAvatars />

      <div
        className={
          "mx-auto text-center flex flex-col items-center justify-center mt-6"
        }
      >
        <h2 className={"text-lg my-0 leading-[1.5 text-center]"}>{getTitle()}</h2>
        <Paragraph className={cn("text-sm text-center max-w-xs")}>
          {getDescription()}
        </Paragraph>
      </div>

      <div className={"px-8 py-3 flex flex-col gap-6 mt-4 relative z-10"}>
        {!isCloud && (
          <SegmentedTabs
            value={mode}
            onChange={(value) => setMode(value as UserCreationMode)}
          >
            <SegmentedTabs.List className="rounded-lg border">
              <SegmentedTabs.Trigger value="invite">
                <IconLink size={16} />
                Invite User
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value="create">
                <IconUserPlus size={16} />
                Create User
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>
        )}

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
            showResources={false}
            showRoutes={false}
            hideAllGroup={true}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <Button
          variant={"primary"}
          className={"w-full"}
          disabled={isDisabled}
          onClick={handleSubmit}
        >
          {getButtonText()}
          {getButtonIcon()}
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
