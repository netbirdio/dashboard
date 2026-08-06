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
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { ExitNodeDropdownButton } from "@/modules/exit-node/ExitNodeDropdownButton";
import { useIntegrations } from "@/modules/integrations/edr/useIntegrations";
import { RDPButton } from "@/modules/remote-access/rdp/RDPButton";
import { SSHButton } from "@/modules/remote-access/ssh/SSHButton";
import { VNCButton } from "@/modules/remote-access/vnc/VNCButton";
import InlineLink from "@components/InlineLink";
import { useDialog } from "@/contexts/DialogProvider";

export default function PeerActionCell() {
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
      title: `Approve peer '${peer.name}'?`,
      description: "Are you sure you want to approve this peer?",
      confirmText: "Approve",
      cancelText: "Cancel",
      type: "default",
    });
    if (!choice) return;
    notify({
      title: `Peer ${peer.name} approved`,
      description: `This peer was approved and can now connect to other peers.`,
      promise: update({
        name: peer.name,
        ssh: peer.ssh_enabled,
        loginExpiration: peer.login_expiration_enabled,
        approval_required: false,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: "Approving peer...",
    });
  };

  const handleBypassCompliance = async () => {
    const choice = await confirm({
      title: `Bypass compliance for '${peer.name}'?`,
      description:
        "This will override the compliance check and allow this peer to connect. " +
        "The bypass will be automatically removed if the device becomes compliant.",
      confirmText: "Bypass Compliance",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice || !peer.id) return;
    notify({
      title: `Compliance bypassed for ${peer.name}`,
      description: `This peer can now connect to other peers.`,
      promise: bypassCompliance(peer.id),
      loadingMessage: "Bypassing compliance...",
    });
  };

  const handleRevokeBypass = async () => {
    const choice = await confirm({
      title: `Revoke compliance bypass for '${peer.name}'?`,
      description:
        "This peer will be subject to normal compliance validation. " +
        "If still non-compliant, it will lose network access.",
      confirmText: "Revoke",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice || !peer.id) return;
    notify({
      title: `Compliance bypass revoked`,
      description: `Peer ${peer.name} is now subject to normal compliance validation.`,
      promise: revokeBypass(peer.id),
      loadingMessage: "Revoking compliance bypass...",
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
    const text = peer.login_expiration_enabled ? "disabled" : "enabled";
    const disableLoginExpiration = peer.login_expiration_enabled;
    notify({
      title: `Session expiration is ${text}`,
      description: `Session expiration for peer ${peer.name} was successfully ${text}.`,
      promise: update({
        loginExpiration: !peer.login_expiration_enabled,
        inactivityExpiration: disableLoginExpiration
          ? false
          : peer.inactivity_expiration_enabled,
      }).then(() => {
        mutate("/peers");
        mutate("/groups");
      }),
      loadingMessage: "Updating session expiration...",
    });
  };

  const disableDashboardSSH = async () => {
    const choice = await confirm({
      title: `Disable SSH Access?`,
      description: (
        <div>
          Starting from NetBird v0.61.0, once SSH access is disabled, you cannot
          re-enable it again from the dashboard. You&apos;ll need to create an
          explicit access control policy and update your NetBird client to
          restore SSH functionality.{" "}
          <InlineLink
            href={"https://docs.netbird.io/manage/peers/ssh"}
            target={"_blank"}
            onClick={(e) => e.stopPropagation()}
          >
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </div>
      ),
      confirmText: "Disable",
      cancelText: "Cancel",
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
              View Details
            </div>
          </DropdownMenuItem>

          {showApprovalGroup && (
            <>
              <DropdownMenuSeparator />
              {showApprove && (
                <DropdownMenuItem onClick={approvePeer}>
                  <div className={"flex gap-3 items-center"}>
                    <CheckCircle2 size={14} className={"shrink-0"} />
                    Approve
                  </div>
                </DropdownMenuItem>
              )}
              {showBypass && (
                <FullTooltip
                  className={"w-full block"}
                  content={
                    <div className={"text-xs max-w-xs"}>
                      Bypass {activeIntegrationName} compliance check and
                      allow this peer to connect. The bypass is automatically
                      removed when the device becomes compliant.
                    </div>
                  }
                >
                  <DropdownMenuItem onClick={handleBypassCompliance}>
                    <div className={"flex gap-3 items-center w-full"}>
                      <ShieldCheck size={14} className={"shrink-0"} />
                      Bypass Compliance
                    </div>
                  </DropdownMenuItem>
                </FullTooltip>
              )}
              {showRevokeBypass && (
                <DropdownMenuItem onClick={handleRevokeBypass}>
                  <div className={"flex gap-3 items-center"}>
                    <ShieldOff size={14} className={"shrink-0"} />
                    Revoke Bypass
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
              <VNCButton peer={peer} isDropdown={true} />
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
                  Expiration is disabled for all peers added with an setup-key.
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
                {peer.login_expiration_enabled ? "Disable" : "Enable"} Session
                Expiration
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
                  {peer.ssh_enabled ? "Disable" : "Enable"} SSH Access
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
              Delete
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
