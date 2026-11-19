"use client";

import Badge from "@components/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import DarkModeToggle from "@components/ui/DarkModeToggle";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { UserAvatar } from "@components/ui/UserAvatar";
import { isMac } from "@hooks/useOperatingSystem";
import { useGuardedRouter } from "@utils/navigation-guard";
import { isNetBirdCloud } from "@utils/netbird";
import { CreditCardIcon, KeyRound, LogOutIcon, User2 } from "lucide-react";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useMSP } from "@/cloud/msp/contexts/MSPProvider";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ChangePasswordModalContent } from "@/modules/users/ChangePasswordModal";

export default function UserDropdown() {
  const t = useTranslations();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const { user } = useApplicationContext();
  const { loggedInUser, logout } = useLoggedInUser();
  const { isRestricted, permission } = usePermissions();
  const router = useGuardedRouter();

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
        <DropdownMenuTrigger
          data-testid="user-dropdown"
          aria-label={t("components.profileAndThemeSettingsAria")}
          className={"flex cursor-pointer items-center gap-2"}
        >
          <Badge variant={"blueDark"}>{t("components.newLightMode")}</Badge>
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
                {t("common.changePassword")}
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={logout}>
            <div className={"flex gap-3 items-center"}>
              <LogOutIcon size={14} />
              {t("common.logOut")}
            </div>
            <DropdownMenuShortcut className={"opacity-75"}>
              {isMac ? (
                "⇧⌘L"
              ) : (
                <span className="flex items-center gap-0.5">
                  Ctrl<span>+</span>⇧<span>+</span>L
                </span>
              )}
            </DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DarkModeToggle />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const ProfileSettingsDropdownItem = ({ onClick }: { onClick: () => void }) => {
  const t = useTranslations();
  const { isMSPInTenantContext } = useMSP();
  const { permission } = usePermissions();

  if (isMSPInTenantContext) return;
  if (!permission?.users.read) return;

  return (
    <DropdownMenuItem onClick={onClick}>
      <div className={"flex gap-3 items-center"}>
        <User2 size={14} />
        {t("common.profileSettings")}
      </div>
    </DropdownMenuItem>
  );
};

const PlansAndBillingDropdownItem = ({ onClick }: { onClick: () => void }) => {
  const t = useTranslations();
  const { permission } = usePermissions();

  const { isAccountWithMSPParent } = useMSP();
  if (isAccountWithMSPParent) return;

  return (
    permission?.billing?.update && (
      <DropdownMenuItem onClick={onClick}>
        <div className={"flex gap-3 items-center"}>
          <CreditCardIcon size={14} />
          {t("common.plansAndBilling")}
        </div>
      </DropdownMenuItem>
    )
  );
};
