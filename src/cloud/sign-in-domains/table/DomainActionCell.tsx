import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import { notify } from "@components/Notification";
import { cn } from "@utils/helpers";
import { TrashIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSignInDomains } from "@/cloud/sign-in-domains/useSignInDomains";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DomainValidationStatus, SignInDomain } from "@/interfaces/Account";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";

type Props = {
  domain: SignInDomain;
};

export default function DomainActionCell({ domain }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { verifyDomain, deleteDomain, mutate } = useSignInDomains();
  const { confirm } = useDialog();
  const [modal, setModal] = useState(false);

  const isVerified =
    domain.validation_status === DomainValidationStatus.VERIFIED;
  const connections = domain.connections ?? [];

  // The account's own domain can never be deleted, so the button is left out
  // entirely rather than shown as a dead control.
  const canRemove = !domain.is_primary;

  // The service does refuse this one, so the button explains why up front
  // instead of letting the request come back with an error.
  const removeBlockedReason =
    connections.length > 0
      ? `This domain is used by ${connections
          .map((connection) => connection.name)
          .join(", ")}. Detach it there before removing it.`
      : undefined;

  const deleteDomainHandler = async () => {
    const choice = await confirm({
      title: `Remove ${domain.name}?`,
      description:
        "Users with an email address on this domain will no longer be matched to your account.",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
      maxWidthClass: "max-w-md",
    });
    if (!choice) return;
    notify({
      title: "Sign-in Domains",
      description: `${domain.name} has been removed`,
      // The refresh runs beside the toast rather than inside its promise: a
      // failed revalidation must not report the successful delete as an error.
      promise: deleteDomain(domain.id).then((res) => {
        mutate().catch(() => {});
        return res;
      }),
      loadingMessage: "Removing domain...",
    });
  };

  return (
    // The min height is one xs button (16px line + 2*8px padding + 2*1px
    // border), so rows that render no button keep the same height as the rest.
    <div className={"flex gap-2 items-center justify-end ml-auto min-h-[34px]"}>
      <DomainVerificationModal
        open={modal}
        onOpenChange={setModal}
        domain={domain.name}
        token={domain.validation_token}
        onVerify={() =>
          verifyDomain(domain.id).then((res) => {
            mutate().catch(() => {});
            return res;
          })
        }
      />

      {!isVerified && (
        <Button
          variant={"secondary"}
          size={"xs"}
          disabled={!permission.settings.update}
          onClick={() => setModal(true)}
          data-testid={"verify-domain"}
        >
          Verify
        </Button>
      )}

      {canRemove && (
        <FullTooltip
          content={
            <div className={"text-xs max-w-xs"}>{removeBlockedReason}</div>
          }
          disabled={!removeBlockedReason}
        >
          <Button
            variant={"danger-outline"}
            size={"xs"}
            // A disabled button swallows hover, so the tooltip would never
            // open; letting the events through to the wrapper keeps it.
            className={cn(
              "!px-3",
              removeBlockedReason && "pointer-events-none",
            )}
            disabled={!!removeBlockedReason || !permission.settings.update}
            onClick={deleteDomainHandler}
            data-testid={"remove-domain"}
          >
            <TrashIcon size={14} />
            Remove
          </Button>
        </FullTooltip>
      )}
    </div>
  );
}
