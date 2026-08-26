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
  SquarePenIcon,
  UnlinkIcon,
} from "lucide-react";
import * as React from "react";
import { useCustomers } from "@/cloud/distributor/contexts/CustomersProvider";
import {
  DistributorCustomer,
  DistributorCustomerStatus,
} from "@/cloud/distributor/interfaces/Distributor";

type Props = {
  customer: DistributorCustomer;
};

export const CustomerActionCell = ({ customer }: Props) => {
  const { openEditCustomerModal, unlinkCustomer } = useCustomers();
  const isActive = customer.status === DistributorCustomerStatus.Active;
  const isInvited = customer.status === DistributorCustomerStatus.Invited;

  return (
    <div className={"flex justify-end pr-4 items-center gap-4"}>
      {isInvited && (
        <FullTooltip
          content={
            <div className={"text-xs max-w-xs"}>
              The customer account owner must log in to the dashboard to accept
              or decline your invitation.
            </div>
          }
        >
          <Badge variant={"yellow"} className={"ml-6 cursor-help"}>
            Pending invitation
            <HelpCircle size={12} />
          </Badge>
        </FullTooltip>
      )}

      <Button
        variant={"default-outline"}
        size={"sm"}
        className={"max-h-[38px]"}
        disabled={!isActive}
        onClick={() => openEditCustomerModal(customer)}
      >
        <SquarePenIcon size={14} />
        Edit
      </Button>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild={true}
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
          <DropdownMenuItem
            variant={"danger"}
            onClick={() => unlinkCustomer(customer)}
          >
            <div className={"flex gap-3 items-center"}>
              <UnlinkIcon size={14} className={"shrink-0"} />
              Unlink
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
