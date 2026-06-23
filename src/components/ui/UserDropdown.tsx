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
import { CreditCardIcon, KeyRound, LogOutIcon, User2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useOSDetection from "@/hooks/useOperatingSystem";
import { ChangePasswordModalContent } from "@/modules/users/ChangePasswordModal";
import { isNetBirdCloud } from "@utils/netbird";
import { Modal } from "@components/modal/Modal";

export default function UserDropdown() {
  const t = useTranslations("userDropdown");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");
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
        <DropdownMenuTrigger data-testid="user-dropdown">
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

          {permission?.billing?.update && (
            <PlansAndBillingDropdownItem
              onClick={() => {
                setDropdownOpen(false);
                router.push("/settings?tab=plans-and-billing");
              }}
            />
          )}

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

          {!isNetBirdCloud() && loggedInUser?.idp_id === "local" && (
            <DropdownMenuItem
              onClick={() => {
                setDropdownOpen(false);
                setChangePasswordModal(true);
              }}
            >
              <div className={"flex gap-3 items-center"}>
                <KeyRound size={14} />
                {tSettings("changePassword")}
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={logout}>
            <div className={"flex gap-3 items-center"}>
              <LogOutIcon size={14} />
              {tCommon("logout")}
            </div>
            <DropdownMenuShortcut>
              {isMac ? "⇧⌘L" : "⇧ ⊞ L"}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const ProfileSettingsDropdownItem = ({ onClick }: { onClick: () => void }) => {
  const t = useTranslations("userDropdown");
  const { isMSPInTenantContext } = useMSP();
  const { permission } = usePermissions();

  if (isMSPInTenantContext) return;
  if (!permission?.users.read) return;

  return (
    <DropdownMenuItem onClick={onClick}>
      <div className={"flex gap-3 items-center"}>
        <User2 size={14} />
        {t("profileSettings")}
      </div>
    </DropdownMenuItem>
  );
};

const PlansAndBillingDropdownItem = ({ onClick }: { onClick: () => void }) => {
  const t = useTranslations("userDropdown");
  const { permission } = usePermissions();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  return (
    permission?.billing?.update && (
      <DropdownMenuItem onClick={onClick}>
        <div className={"flex gap-3 items-center"}>
          <CreditCardIcon size={14} />
          {t("plansAndBilling")}
        </div>
      </DropdownMenuItem>
    )
  );
};
