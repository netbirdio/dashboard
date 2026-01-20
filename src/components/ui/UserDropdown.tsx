"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { UserAvatar } from "@components/ui/UserAvatar";
import { KeyRound, LogOutIcon, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useOSDetection from "@/hooks/useOperatingSystem";
import { ChangePasswordModalContent } from "@/modules/users/ChangePasswordModal";
import { isNetBirdHosted } from "@utils/netbird";
import { Modal } from "@components/modal/Modal";

export default function UserDropdown() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const { user } = useApplicationContext();
  const { loggedInUser, logout } = useLoggedInUser();
  const { isRestricted, permission } = usePermissions();
  const isMac = useOSDetection();
  const router = useRouter();

  useHotkeys("shift+mod+l", () => logout(), []);

  return (
    <>
      <Modal
        open={changePasswordModal}
        onOpenChange={setChangePasswordModal}
        key={changePasswordModal ? 1 : 0}
      >
        <ChangePasswordModalContent
          userId={loggedInUser?.id}
          onSuccess={() => setChangePasswordModal(false)}
        />
      </Modal>
      <DropdownMenu
        modal={false}
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
      >
      <DropdownMenuTrigger>
        <UserAvatar size={"medium"} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5 px-1">
            <div className="text-sm font-medium leading-none dark:text-gray-300">
              <TextWithTooltip
                text={user?.name}
                maxChars={20}
                hideTooltip={true}
              />
            </div>
            <div className="text-xs leading-none dark:text-gray-400">
              <TextWithTooltip
                text={user?.email}
                maxChars={28}
                hideTooltip={true}
              />
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {!isRestricted && (
          <ProfileSettingsDropdownItem
            onClick={() => {
              setDropdownOpen(false);
              if (loggedInUser) {
                router.push(`/team/user?id=${loggedInUser.id}`);
              }
            }}
          />
        )}

        {!isNetBirdHosted() && loggedInUser?.idp_id === "local" && (
            <DropdownMenuItem
              onClick={() => {
                setDropdownOpen(false);
                setChangePasswordModal(true);
              }}
            >
              <div className={"flex gap-3 items-center"}>
                <KeyRound size={14} />
                Change Password
              </div>
            </DropdownMenuItem>
          )}

        <DropdownMenuItem onClick={logout}>
          <div className={"flex gap-3 items-center"}>
            <LogOutIcon size={14} />
            Log out
          </div>
          <DropdownMenuShortcut>{isMac ? "⇧⌘L" : "⇧ ⊞ L"}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}

const ProfileSettingsDropdownItem = ({ onClick }: { onClick: () => void }) => {
  return (
    <DropdownMenuItem onClick={onClick}>
      <div className={"flex gap-3 items-center"}>
        <User2 size={14} />
        Profile Settings
      </div>
    </DropdownMenuItem>
  );
};
