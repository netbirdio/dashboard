import Badge from "@components/Badge";
import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import FullTooltip from "@components/FullTooltip";
import {
  HelpCircle,
  MoreVertical,
  ShieldCheckIcon,
  ShieldUserIcon,
  SquarePenIcon,
  Trash2,
  UnlinkIcon,
} from "lucide-react";
import * as React from "react";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import { Tenant, TenantStatus } from "@/cloud/msp/interfaces/Tenant";

type Props = {
  tenant: Tenant;
};
export const TenantActionCell = ({ tenant }: Props) => {
  const {
    openEditTenantModal,
    verifyDomain,
    openUnlinkTenantModal,
    deleteTenant,
    openAccountExistsModal,
  } = useTenants();
  const isPending = tenant.status === TenantStatus.Pending;
  const isActive = tenant.status === TenantStatus.Active;
  const isExisting = tenant.status === TenantStatus.Existing;
  const isInvited = tenant.status === TenantStatus.Invited;
  const canEdit = isPending || isActive;

  return (
    <div className={"flex justify-end pr-4 items-center gap-4"}>
      {isPending && (
        <Button
          variant={"default-outline"}
          size={"sm"}
          className={"max-h-[38px]"}
          onClick={() => verifyDomain(tenant, true)}
        >
          <ShieldCheckIcon size={14} />
          Verify Domain
        </Button>
      )}

      {isExisting && (
        <Button
          variant={"default-outline"}
          size={"sm"}
          className={"max-h-[38px]"}
          onClick={() => openAccountExistsModal(tenant)}
        >
          <ShieldUserIcon size={16} />
          Request Access
        </Button>
      )}

      {isInvited && (
        <FullTooltip
          content={
            <div className={"text-xs max-w-xs"}>
              The account owner must log in to the dashboard to accept or
              decline your request.
            </div>
          }
        >
          <Badge variant={"yellow"} className={"ml-6 cursor-help"}>
            Pending access request
            <HelpCircle size={12} />
          </Badge>
        </FullTooltip>
      )}

      <Button
        variant={"default-outline"}
        size={"sm"}
        className={"max-h-[38px]"}
        disabled={!canEdit}
        onClick={() => openEditTenantModal(tenant)}
      >
        <SquarePenIcon size={14} />
        Edit
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
          disabled={!canEdit}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <Button variant={"secondary"} size={"sm"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem onClick={() => openUnlinkTenantModal(tenant)}>
            <div className={"flex gap-3 items-center"}>
              <UnlinkIcon size={14} className={"shrink-0"} />
              Unlink
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            variant={"danger"}
            onClick={() => deleteTenant(tenant)}
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
};
