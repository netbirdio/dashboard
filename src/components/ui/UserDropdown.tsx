"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import { UserAvatar } from "@components/ui/UserAvatar";
import { GlobeIcon, KeyRound, LogOutIcon, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useApplicationContext } from "@/contexts/ApplicationProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import useOSDetection from "@/hooks/useOperatingSystem";
import { useI18n } from "@/i18n/I18nProvider";
import { ChangePasswordModalContent } from "@/modules/users/ChangePasswordModal";
import { isNetBirdHosted } from "@utils/netbird";

export default function UserDropdown() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const { user } = useApplicationContext();
  const { loggedInUser, logout } = useLoggedInUser();
  const { isRestricted } = usePermissions();
  const isMac = useOSDetection();
  const router = useRouter();
  const { locale, locales, setLocale, t } = useI18n();

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
              label={t("user.profileSettings")}
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
                {t("user.changePassword")}
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <div className={"flex gap-3 items-center"}>
                <GlobeIcon size={14} />
                {t("common.language")}
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {locales.map((language) => (
                <DropdownMenuItem
                  key={language}
                  onClick={() => {
                    setLocale(language);
                    setDropdownOpen(false);
                  }}
                >
                  <div className={"flex gap-3 items-center"}>
                    <span>
                      {t(
                        language === "en"
                          ? "common.language.en"
                          : "common.language.zh-CN",
                      )}
                    </span>
                    {locale === language && <span>{t("common.selected")}</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={logout}>
            <div className={"flex gap-3 items-center"}>
              <LogOutIcon size={14} />
              {t("user.logout")}
            </div>
            <DropdownMenuShortcut>
              {isMac ? "Shift+Cmd+L" : "Shift+Ctrl+L"}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const ProfileSettingsDropdownItem = ({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) => {
  return (
    <DropdownMenuItem onClick={onClick}>
      <div className={"flex gap-3 items-center"}>
        <User2 size={14} />
        {label}
      </div>
    </DropdownMenuItem>
  );
};
