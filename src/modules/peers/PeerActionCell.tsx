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
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  CheckCircle2,
  ExternalLinkIcon,
  MonitorIcon,
  MoreVertical,
  TerminalSquare,
  TimerResetIcon,
  Trash2,
} from "lucide-react";
import { useTranslations } from 'next-intl';
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { ExitNodeDropdownButton } from "@/modules/exit-node/ExitNodeDropdownButton";
import { RDPButton } from "@/modules/remote-access/rdp/RDPButton";
import { SSHButton } from "@/modules/remote-access/ssh/SSHButton";
import InlineLink from "@components/InlineLink";
import { useDialog } from "@/contexts/DialogProvider";

export default function PeerActionCell() {
  const t = useTranslations('peers');
  const tCommon = useTranslations('common');
  const { peer, deletePeer, update, toggleSSH, setSSHInstructionsModal } =
    usePeer();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { confirm } = useDialog();

  const showSSHButton = useMemo(() => {
    const isClientSSHEnabled = peer?.local_flags?.server_ssh_allowed;
    const isDashboardSSHEnabled = peer?.ssh_enabled;
    if (isDashboardSSHEnabled) return true;
    return !isClientSSHEnabled;
  }, [peer]);

  const showApprove = peer.approval_required && permission.peers.update;

  const approvePeer = async () => {
    const choice = await confirm({
      title: t('confirmApprove', { name: peer.name }),
      description: t('confirmApproveDescription'),
      confirmText: t('approve'),
      cancelText: tCommon('cancel'),
      type: "default",
    });
    if (!choice) return;
    notify({
      title: t('approveSuccess', { name: peer.name }),
      description: t('approveSuccessDescription'),
      promise: update({
        name: peer.name,
        ssh: peer.ssh_enabled,
        loginExpiration: peer.login_expiration_enabled,
        approval_required: false,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t('approveLoading'),
    });
  };

  // The Connect column previously hosted SSH / RDP entry points. We
  // fold those into the action menu — gated on a non-mobile, online
  // peer — so the table loses a column and the connect affordance is
  // one click away inside the three-dot menu.
  const peerOs = getOperatingSystem(peer?.os);
  const isMobile =
    peerOs === OperatingSystem.ANDROID || peerOs === OperatingSystem.IOS;
  const showRemoteAccessItems = !isMobile && !!peer.connected;

  const toggleLoginExpiration = async () => {
    const text = peer.login_expiration_enabled ? tCommon('disabled') : tCommon('enabled');
    const disableLoginExpiration = peer.login_expiration_enabled;
    notify({
      title: t('loginExpirationUpdated', { state: text }),
      description: t('loginExpirationUpdateDescription', { name: peer.name, state: text }),
      promise: update({
        loginExpiration: !peer.login_expiration_enabled,
        inactivityExpiration: disableLoginExpiration
          ? false
          : peer.inactivity_expiration_enabled,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t('loginExpirationUpdating'),
    });
  };

  const disableDashboardSSH = async () => {
    const choice = await confirm({
      title: t('disableSSHConfirmation'),
      description: (
        <div>
          {t('disableSSHDescription')}{" "}
          <InlineLink
            href={"https://docs.netbird.io/manage/peers/ssh"}
            target={"_blank"}
            onClick={(e) => e.stopPropagation()}
          >
            {t('sshLearnMore')}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </div>
      ),
      confirmText: t('disableSSH'),
      cancelText: tCommon('cancel'),
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
              {t('viewDetails')}
            </div>
          </DropdownMenuItem>

          {showApprove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={approvePeer}>
                <div className={"flex gap-3 items-center"}>
                  <CheckCircle2 size={14} className={"shrink-0"} />
                  {t('approve')}
                </div>
              </DropdownMenuItem>
            </>
          )}

          {showRemoteAccessItems && (
            <>
              <DropdownMenuSeparator />
              <SSHButton peer={peer} isDropdown={true} />
              <RDPButton peer={peer} isDropdown={true} />
            </>
          )}

          <DropdownMenuSeparator />
          <FullTooltip
            content={
              <div
                className={"flex gap-2 items-center !text-nb-gray-300 text-xs"}
              >
                <IconInfoCircle size={14} />
                <span>{t('expirationDisabledTooltip')}</span>
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
                {peer.login_expiration_enabled ? t('disableLoginExpiration') : t('enableLoginExpiration')}
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
                  {peer.ssh_enabled ? t('disableSSH') : t('enableSSH')}
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
              {t('delete')}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
