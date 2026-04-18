import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  ExternalLinkIcon,
  MonitorIcon,
  MoreVertical,
  TerminalSquare,
  TimerResetIcon,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { ExitNodeDropdownButton } from "@/modules/exit-node/ExitNodeDropdownButton";
import InlineLink from "@components/InlineLink";
import { useDialog } from "@/contexts/DialogProvider";
import { useI18n } from "@/i18n/I18nProvider";

export default function PeerActionCell() {
  const { peer, deletePeer, update, toggleSSH, setSSHInstructionsModal } =
    usePeer();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const { t } = useI18n();

  const showSSHButton = useMemo(() => {
    const isClientSSHEnabled = peer?.local_flags?.server_ssh_allowed;
    const isDashboardSSHEnabled = peer?.ssh_enabled;
    if (isDashboardSSHEnabled) return true;
    return !isClientSSHEnabled;
  }, [peer]);

  const toggleLoginExpiration = async () => {
    const disableLoginExpiration = peer.login_expiration_enabled;
    notify({
      title: disableLoginExpiration
        ? t("peerActionCell.sessionExpirationDisabled")
        : t("peerActionCell.sessionExpirationEnabled"),
      description: disableLoginExpiration
        ? t("peerActionCell.sessionExpirationDescriptionDisabled", {
            name: peer.name,
          })
        : t("peerActionCell.sessionExpirationDescriptionEnabled", {
            name: peer.name,
          }),
      promise: update({
        loginExpiration: !peer.login_expiration_enabled,
        inactivityExpiration: disableLoginExpiration
          ? false
          : peer.inactivity_expiration_enabled,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t("peerActionCell.updatingSessionExpiration"),
    });
  };

  const disableDashboardSSH = async () => {
    const choice = await confirm({
      title: t("peerSsh.disableTitle"),
      description: (
        <div>
          {t("peerSsh.disableDescription")}{" "}
          <InlineLink
            href={"https://docs.netbird.io/manage/peers/ssh"}
            target={"_blank"}
            onClick={(e) => e.stopPropagation()}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </div>
      ),
      confirmText: t("peerSsh.disable"),
      cancelText: t("common.cancel"),
      type: "warning",
      maxWidthClass: "max-w-xl",
    });
    if (!choice) return;
    toggleSSH(false);
  };

  return (
    <div className={"flex justify-end pr-4 gap-3"}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => router.push("/peer?id=" + peer.id)}
            disabled={!permission.peers.read}
          >
            <div className={"flex gap-3 items-center"}>
              <MonitorIcon size={14} className={"shrink-0"} />
              {t("actions.viewDetails")}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <FullTooltip
            content={
              <div
                className={"flex gap-2 items-center !text-nb-gray-300 text-xs"}
              >
                <IconInfoCircle size={14} />
                <span>
                  {t("peerActionCell.expirationDisabledTooltip")}
                </span>
              </div>
            }
            className={"w-full block"}
            disabled={!!peer.user_id}
          >
            <DropdownMenuItem
              onClick={toggleLoginExpiration}
              disabled={!peer.user_id || !permission.peers.update}
            >
              <div className={"flex gap-3 items-center w-full"}>
                <TimerResetIcon size={14} className={"shrink-0"} />
                {peer.login_expiration_enabled
                  ? t("peerActionCell.disableSessionExpiration")
                  : t("peerActionCell.enableSessionExpiration")}
              </div>
            </DropdownMenuItem>
          </FullTooltip>

          {showSSHButton && (
            <DropdownMenuItem
              onClick={() =>
                peer.ssh_enabled
                  ? disableDashboardSSH()
                  : setSSHInstructionsModal(true)
              }
              disabled={!permission.peers.update}
            >
              <div className={"flex gap-3 items-center w-full"}>
                <TerminalSquare size={14} className={"shrink-0"} />
                <div className={"flex justify-between items-center w-full"}>
                  {peer.ssh_enabled
                    ? t("peerActionCell.disableSshAccess")
                    : t("peerActionCell.enableSshAccess")}
                </div>
              </div>
            </DropdownMenuItem>
          )}

          <ExitNodeDropdownButton peer={peer} />

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={deletePeer}
            variant={"danger"}
            disabled={!permission.peers.delete}
          >
            <div className={"flex gap-3 items-center"}>
              <Trash2 size={14} className={"shrink-0"} />
              {t("actions.delete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
