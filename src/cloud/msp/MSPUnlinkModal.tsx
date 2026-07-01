import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import { UserSelector } from "@components/UserSelector";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, InfoIcon, UnlinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useTenants } from "@/cloud/msp/contexts/TenantsProvider";
import { Tenant } from "@/cloud/msp/interfaces/Tenant";
import { User } from "@/interfaces/User";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  tenant: Tenant;
};

export const MSPUnlinkModal = ({ open, setOpen, tenant }: Props) => {
  const { unlinkTenant } = useTenants();
  const { data: users } = useFetchApi<User[]>(
    `/users?service_user=false&account=${tenant.id}`,
    true,
    false,
    true,
    {
      ignoreGlobalParams: true,
    },
  );

  const [selectedUser, setSelectedUser] = useState<User>();

  return (
    tenant && (
      <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
        <ModalContent maxWidthClass={"max-w-lg"}>
          <ModalHeader
            icon={<UnlinkIcon size={16} />}
            title={"Unlink Tenant"}
            description={`${tenant.name} (${tenant.domain})`}
            color={"yellow"}
          />
          <Separator />
          <div className={"px-8 py-6"}>
            <Label>New Owner</Label>
            <HelpText>
              In order to unlink this tenant, you need to assign a new owner.
            </HelpText>
            <UserSelector
              onChange={setSelectedUser}
              value={selectedUser}
              options={users}
              placeholder={"Select a new owner..."}
            />
            <div
              className={cn(
                "px-4 py-3 rounded-md border text-sm font-normal flex gap-3",
                "mt-6",
                "bg-nb-gray-900/60 border-nb-gray-800/80 text-nb-gray-300",
              )}
            >
              <InfoIcon size={14} className={"shrink-0 relative top-[2.5px]"} />
              <div>
                After unlinking, the existing subscription for this tenant will
                be canceled, and the new owner will need to set up their own
                billing information.
              </div>
            </div>
          </div>
          <ModalFooter className={"items-center"}>
            <div className={"w-full"}>
              <Paragraph className={"text-sm mt-auto"}>
                Learn more about
                <InlineLink href={"https://docs.netbird.io/"} target={"_blank"}>
                  Unlinking Tenants
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </Paragraph>
            </div>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>Cancel</Button>
              </ModalClose>

              <Button
                variant={"primary"}
                disabled={!selectedUser}
                onClick={() => {
                  if (!selectedUser) return;
                  unlinkTenant(tenant, selectedUser).then();
                }}
              >
                Unlink
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  );
};
