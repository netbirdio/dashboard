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
  ShieldCheck,
  ShieldOff,
  TerminalSquare,
  TimerResetIcon,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { useSWRConfig } from "swr";
import { useBypass, useBypassedPeers } from "@/cloud/edr/useBypass";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { ExitNodeDropdownButton } from "@/modules/exit-node/ExitNodeDropdownButton";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import { RDPButton } from "@/modules/remote-access/rdp/RDPButton";
import { SSHButton } from "@/modules/remote-access/ssh/SSHButton";
import InlineLink from "@components/InlineLink";
import { useDialog } from "@/contexts/DialogProvider";

export default function PeerActionCell() {
  const t = useTranslations();
  const { peer, deletePeer, update, toggleSSH, setSSHInstructionsModal } =
    usePeer();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { confirm } = useDialog();

  // Approval / EDR-bypass state. We pull this directly so the action
  // menu can offer Approve / Bypass / Revoke without the inline badges
  // that used to live in PeerStatusCell.
  const { isAnyIntegrationEnabled, activeIntegrationName } = useIntegrations();
  const { bypassCompliance, revokeBypass, canBypass } = useBypass();
  const { isBypassed: checkBypassed } = useBypassedPeers();
  const isBypassed = peer.id ? checkBypassed(peer.id) : false;
  const canApprove = permission.peers.update;
  const needsApproval = peer.approval_required;

  const approvePeer = async () => {
    const choice = await confirm({
      title: t("peers.approveConfirmTitle", { name: peer.name }),
      description: t("peers.confirmApproveDescription"),
      confirmText: t("peers.approve"),
      cancelText: t("common.cancel"),
      type: "default",
    });
    if (!choice) return;
    notify({
      title: t("peers.approvedTitle", { name: peer.name }),
      description: t("peers.approveSuccessDescription"),
      promise: update({
        name: peer.name,
        ssh: peer.ssh_enabled,
        loginExpiration: peer.login_expiration_enabled,
        approval_required: false,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: t("peers.approveLoading"),
    });
  };

  const handleBypassCompliance = async () => {
    const choice = await confirm({
      title: t("peers.bypassConfirmTitle", { name: peer.name }),
      description: t("peers.bypassConfirmDescription"),
      confirmText: t("peers.bypassCompliance"),
      cancelText: t("common.cancel"),
      type: "warning",
    });
    if (!choice || !peer.id) return;
    notify({
      title: t("peers.complianceBypassedTitle", { name: peer.name }),
      description: t("peers.bypassComplianceSuccessDescription"),
      promise: bypassCompliance(peer.id),
      loadingMessage: t("peers.bypassComplianceLoading"),
    });
  };

  const handleRevokeBypass = async () => {
    const choice = await confirm({
      title: t("peers.revokeBypassConfirmTitle", { name: peer.name }),
      description: t("peers.revokeBypassConfirmDescription"),
      confirmText: t("peers.revoke"),
      cancelText: t("common.cancel"),
      type: "warning",
    });
    if (!choice || !peer.id) return;
    notify({
      title: t("peers.revokeBypassSuccess"),
      description: t("peers.revokeBypassPeerDescription", {
        name: peer.name,
      }),
      promise: revokeBypass(peer.id),
      loadingMessage: t("peers.revokeBypassLoading"),
    });
  };

  // Which approval items to show:
  //   • Approve  — pending approval AND no EDR integration is on
  //   • Bypass   — pending approval AND EDR is on AND user can bypass
  //   • Revoke   — currently bypassed AND user can revoke
  const showApprove = needsApproval && !isAnyIntegrationEnabled && canApprove;
  const showBypass =
    needsApproval && isAnyIntegrationEnabled && canBypass && !isBypassed;
  const showRevokeBypass = isBypassed && canBypass;
  const showApprovalGroup = showApprove || showBypass || showRevokeBypass;

  const showSSHButton = useMemo(() => {
    const isClientSSHEnabled = peer?.local_flags?.server_ssh_allowed;
    const isDashboardSSHEnabled = peer?.ssh_enabled;
    if (isDashboardSSHEnabled) return true;
    return !isClientSSHEnabled;
  }, [peer]);

  // The Connect column previously hosted SSH / RDP entry points. We
  // fold those into the action menu — gated on a non-mobile, online
  // peer — so the table loses a column and the connect affordance is
  // one click away inside the three-dot menu.
  const peerOs = getOperatingSystem(peer?.os);
  const isMobile =
    peerOs === OperatingSystem.ANDROID || peerOs === OperatingSystem.IOS;
  const showRemoteAccessItems = !isMobile && !!peer.connected;

  const toggleLoginExpiration = async () => {
    const enabled = !peer.login_expiration_enabled;
    const disableLoginExpiration = peer.login_expiration_enabled;
    notify({
      title: enabled
        ? t("peers.sessionExpirationEnabledTitle")
        : t("peers.sessionExpirationDisabledTitle"),
      description: enabled
        ? t("peers.sessionExpirationEnabledDescription", { name: peer.name })
        : t("peers.sessionExpirationDisabledDescription", {
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
      loadingMessage: t("peers.loginExpirationUpdating"),
    });
  };

  const disableDashboardSSH = async () => {
    const choice = await confirm({
      title: t("peers.disableSSHConfirmation"),
      description: t.rich("peers.disableSshDashboardDescription", {
        link: (chunks) => (
          <InlineLink
            href={"https://docs.netbird.io/manage/peers/ssh"}
            target={"_blank"}
            onClick={(e) => e.stopPropagation()}
          >
            {chunks}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        ),
      }),
      confirmText: t("common.disable"),
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
          <Button variant={"secondary"} className={"!px-3 dark:border"} border={0}>
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
              {t("peers.viewDetails")}
            </div>
          </DropdownMenuItem>

          {showApprovalGroup && (
            <>
              <DropdownMenuSeparator />
              {showApprove && (
                <DropdownMenuItem onClick={approvePeer}>
                  <div className={"flex gap-3 items-center"}>
                    <CheckCircle2 size={14} className={"shrink-0"} />
                    {t("peers.approve")}
                  </div>
                </DropdownMenuItem>
              )}
              {showBypass && (
                <FullTooltip
                  className={"w-full block"}
                  content={
                    <div className={"text-xs max-w-xs"}>
                      {t("peers.bypassIntegrationTooltip", {
                        integration: activeIntegrationName,
                      })}
                    </div>
                  }
                >
                  <DropdownMenuItem onClick={handleBypassCompliance}>
                    <div className={"flex gap-3 items-center w-full"}>
                      <ShieldCheck size={14} className={"shrink-0"} />
                      {t("peers.bypassCompliance")}
                    </div>
                  </DropdownMenuItem>
                </FullTooltip>
              )}
              {showRevokeBypass && (
                <DropdownMenuItem onClick={handleRevokeBypass}>
                  <div className={"flex gap-3 items-center"}>
                    <ShieldOff size={14} className={"shrink-0"} />
                    {t("peers.revokeBypass")}
                  </div>
                </DropdownMenuItem>
              )}
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
                <span>
                  {t("peers.expirationDisabledSetupKey")}
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
                {peer.login_expiration_enabled ? t("common.disable") : t("common.enable")}{" " + t("peers.loginExpiration")}
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
                  {peer.ssh_enabled ? t("common.disable") : t("common.enable")}{" " + t("peers.sshAccess")}
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
              {t("common.delete")}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
