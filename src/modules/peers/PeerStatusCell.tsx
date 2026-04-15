import Badge from "@components/Badge";
import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { HelpCircle } from "lucide-react";
import * as React from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";

type Props = {
  peer: Peer;
};

export default function PeerStatusCell({ peer }: Props) {
  const { t } = useI18n();
  const { update } = usePeer();
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const needsApproval = peer.approval_required;
  const { permission } = usePermissions();
  const canApprove = permission.peers.update;

  const approvePeer = async () => {
    const choice = await confirm({
      title: t("peerApproval.confirmTitle", { name: peer.name }),
      description: t("peerApproval.confirmDescription"),
      confirmText: t("peerApproval.approve"),
      cancelText: t("common.cancel"),
      type: "default",
    });
    if (choice) {
      notify({
        title: t("peerApproval.approvedTitle", { name: peer.name }),
        description: t("peerApproval.approvedDescription"),
        promise: update({
          name: peer.name,
          ssh: peer.ssh_enabled,
          loginExpiration: peer.login_expiration_enabled,
          approval_required: false,
        }).then(() => {
          mutate("/peers");
          mutate("/groups");
        }),
        loadingMessage: t("peerApproval.approving"),
      });
    }
  };

    return (
        needsApproval && (
            <div className={"flex gap-3 items-center text-xs"}>
                <FullTooltip
                    content={
                        <div className={"max-w-xs text-xs"}>
                            {t("peerApproval.help")}
                        </div>
                    }
                    interactive={false}
                >
                    <Badge variant={"netbird"} className={"px-3 font-medium"}>
                        <HelpCircle size={12} />
                        {t("peerApproval.required")}
                    </Badge>
                </FullTooltip>
                { canApprove && (
                    <Button
                        variant={"secondary"}
                        size={"xs"}
                        className={"h-[32px]"}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!canApprove) return;
                            approvePeer();
                        }}
                    >
                        {t("peerApproval.approve")}
                    </Button>
                )}
            </div>
        )
    );
}
