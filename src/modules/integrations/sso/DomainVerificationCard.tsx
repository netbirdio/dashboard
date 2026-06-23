import Button from "@components/Button";
import Card from "@components/Card";
import { notify } from "@components/Notification";
import { cn } from "@utils/helpers";
import { TrashIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import {
  DomainValidationStatus,
  EnterpriseConnectionDomain,
} from "@/interfaces/IdentityProvider";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";
import { useEnterpriseConnections } from "@/modules/integrations/sso/useEnterpriseConnections";

type Props = {
  domain: EnterpriseConnectionDomain;
  connectionId: string;
};
export const DomainVerificationCard = ({ domain, connectionId }: Props) => {
  const [modal, setModal] = useState(false);
  const { deleteDomain, mutate } = useEnterpriseConnections();
  const { confirm } = useDialog();

  const deleteDomainHandler = async () => {
    const choice = await confirm({
      title: `Remove Domain?`,
      description: "Are you sure you want to remove this domain?",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    notify({
      title: "Okta Domains",
      description: `${domain.name} has been removed`,
      promise: deleteDomain(connectionId, domain.name).then(() => mutate()),
      loadingMessage: "Removing domain...",
    });
  };

  const isVerified =
    domain.validation_status === DomainValidationStatus.VERIFIED;

  return (
    <Card className={"w-full justify-between flex p-4 pl-5"}>
      <DomainVerificationModal
        open={modal}
        onOpenChange={setModal}
        domain={domain.name}
        token={domain.validation_token}
        connectionId={connectionId}
      />
      <div className={"flex flex-col"}>
        <span
          className={"text-sm text-nb-gray-100 mb-1 flex gap-2 items-center"}
        >
          {domain.name}
        </span>
        <VerificationStatus status={domain.validation_status} />
      </div>
      <div className={"flex gap-2 items-center"}>
        {!isVerified && (
          <Button
            variant={"secondary"}
            size={"xs"}
            onClick={() => setModal(true)}
          >
            Verify
          </Button>
        )}

        <Button
          variant={"danger-outline"}
          size={"xs"}
          onClick={deleteDomainHandler}
        >
          <TrashIcon size={14} />
          Remove
        </Button>
      </div>
    </Card>
  );
};

const VerificationStatus = ({ status }: { status: DomainValidationStatus }) => {
  const isVerified = status === DomainValidationStatus.VERIFIED;
  const isPending = status === DomainValidationStatus.PENDING;
  const isFailed = status === DomainValidationStatus.FAILED;

  return (
    <span
      className={cn(
        "text-xs flex items-center gap-1.5 text-nb-gray-300 font-medium",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isVerified && "bg-green-400",
          isPending && "bg-yellow-400",
          isFailed && "bg-red-500",
        )}
      ></span>
      {isVerified && "Ownership Verified"}
      {isFailed && "Verification Failed"}
      {isPending && "Pending Verification"}
    </span>
  );
};
