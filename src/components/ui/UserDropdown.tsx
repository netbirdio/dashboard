"use client";

import { useOidc } from "@axa-fr/react-oidc";
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
import { LogOutIcon, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useOSDetection from "@/hooks/useOperatingSystem";
import loadConfig from "@/utils/config";

const config = loadConfig();

export default function UserDropdown() {
  const { logout } = useOidc();
  const { user } = useApplicationContext();
  const { loggedInUser } = useLoggedInUser();
  const isMac = useOSDetection();
  const router = useRouter();
  const logoutSession = async () => {
    logout("/", { client_id: config.clientId }).then();
  };

  useHotkeys("shift+mod+l", () => logout(), []);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <DropdownMenu
      modal={false}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
    >
      <DropdownMenuTrigger>
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
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
        <DropdownMenuItem
          onClick={() => {
            setDropdownOpen(false);
            if (loggedInUser) {
              router.push(`/team/user?id=${loggedInUser.id}`);
            }
          }}
        >
          <div className={"flex gap-3 items-center"}>
            <User2 size={14} />
            Profile Settings
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logoutSession}>
          <div className={"flex gap-3 items-center"}>
            <LogOutIcon size={14} />
            Log out
          </div>
          <DropdownMenuShortcut>{isMac ? "⇧⌘L" : "⇧ ⊞ L"}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
