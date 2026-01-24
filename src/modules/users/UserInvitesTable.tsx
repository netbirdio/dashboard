import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import { Modal, ModalContent, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import MultipleGroups from "@components/ui/MultipleGroups";
import Skeleton from "react-loading-skeleton";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import useFetchApi, { useApiCall } from "@utils/api";
import { notify } from "@components/Notification";
import { RefreshCw } from "lucide-react";
import { isNetBirdHosted } from "@utils/netbird";
import dayjs from "dayjs";
import {
  Cog,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  EyeIcon,
  Link2,
  MailPlus,
  NetworkIcon,
  Trash2,
  User2,
} from "lucide-react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import Badge from "@components/Badge";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn, generateColorFromString } from "@utils/helpers";
import { Group } from "@/interfaces/Group";
import { Role, UserInviteListItem } from "@/interfaces/User";
import UserInviteModal from "@/modules/users/UserInviteModal";
import { useAccount } from "@/modules/account/useAccount";

// Name cell for invites - same styling as UserNameCell but for invites
function InviteNameCell({ invite }: { invite: UserInviteListItem }) {
  return (
    <div
      className={cn("flex gap-4 px-2 py-1 items-center")}
      data-cy={"invite-name-cell"}
    >
      <div
        className={
          "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{
          color: generateColorFromString(invite.name || invite.email),
        }}
      >
        {invite?.name?.charAt(0) || invite?.email?.charAt(0)}
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {invite.name}
        </span>
        <span className={cn("text-sm text-nb-gray-400")}>{invite.email}</span>
      </div>
    </div>
  );
}

// Role cell for invites - same styling as UserRoleCell but for invites
function InviteRoleCell({ invite }: { invite: UserInviteListItem }) {
  const role = invite.role as Role;

  return (
    <div className={cn("flex gap-3 items-center text-nb-gray-200")}>
      <Badge variant={role === "owner" ? "netbird" : "gray"}>
        {role === Role.User && (
          <>
            <User2 size={14} />
            User
          </>
        )}
        {role === Role.Admin && (
          <>
            <Cog size={14} />
            Admin
          </>
        )}
        {role === Role.Owner && (
          <>
            <NetBirdIcon size={14} />
            Owner
          </>
        )}
        {role === Role.BillingAdmin && (
          <>
            <CreditCardIcon size={14} />
            Billing Admin
          </>
        )}
        {role === Role.Auditor && (
          <>
            <EyeIcon size={14} />
            Auditor
          </>
        )}
        {role === Role.NetworkAdmin && (
          <>
            <NetworkIcon size={14} />
            Network Admin
          </>
        )}
      </Badge>
    </div>
  );
}

// Regenerate cell for invites - button to regenerate invite link with modal
type RegenerateResponse = {
  invite_link: string;
  invite_expires_at: string;
};

function InviteRegenerateCell({ invite }: { invite: UserInviteListItem }) {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [regeneratedData, setRegeneratedData] = useState<RegenerateResponse | null>(null);

  const regenerateRequest = useApiCall<RegenerateResponse>(
    `/users/invites/${invite.id}/regenerate`,
  );

  const getInviteFullUrl = () => {
    if (!regeneratedData) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/invite?token=${regeneratedData.invite_link}`;
  };

  const [, copyToClipboard] = useCopyToClipboard(getInviteFullUrl());

  const handleRegenerate = async () => {
    notify({
      title: "Regenerate Invite",
      description: `Regenerating invite link for ${invite.name}...`,
      promise: regenerateRequest.post({}).then((response) => {
        setRegeneratedData(response);
        setModalOpen(true);
        mutate("/users/invites");
      }),
      loadingMessage: "Regenerating...",
    });
  };

  const handleCopyAndClose = () => {
    copyToClipboard("Invite link was copied to your clipboard!").then(() => {
      setRegeneratedData(null);
      setModalOpen(false);
    });
  };

  return (
    <>
      <div className={"flex"}>
        <Button
          variant="secondary"
          size="xs"
          onClick={handleRegenerate}
          disabled={!permission.users.update}
        >
          <RefreshCw size={14} />
          Regenerate
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRegeneratedData(null);
          }
          setModalOpen(open);
        }}
      >
        <ModalContent
          maxWidthClass={"max-w-xl"}
          className={"mt-20"}
          showClose={true}
        >
          <div className={"pb-6 px-8"}>
            <div className={"flex flex-col items-center justify-center gap-3"}>
              <div>
                <h2 className={"text-2xl text-center mb-2"}>
                  Invite link regenerated!
                </h2>
                <Paragraph className={"mt-0 text-sm text-center"}>
                  Share this link with the user. They will be able to set their own password.
                </Paragraph>
              </div>
            </div>
          </div>

          <div className={"px-8 pb-6"}>
            <Code
              message={"Invite link was copied to your clipboard!"}
              codeToCopy={getInviteFullUrl()}
            >
              <span className="break-all whitespace-normal block">
                {getInviteFullUrl()}
              </span>
            </Code>
            {regeneratedData && (
              <Paragraph className={"mt-3 text-xs text-nb-gray-400 text-center"}>
                Expires on{" "}
                {new Date(regeneratedData.invite_expires_at).toLocaleString()}
              </Paragraph>
            )}
          </div>
          <ModalFooter className={"items-center"}>
            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={handleCopyAndClose}
            >
              <CopyIcon size={14} />
              Copy & Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

// Groups cell for invites - read-only display of auto_groups
function InviteGroupCell({ invite }: { invite: UserInviteListItem }) {
  const { groups, isLoading } = useGroups();

  const foundGroups = useMemo(() => {
    if (isLoading || !groups) return [];
    return (invite.auto_groups || [])
      .map((groupId) => groups.find((g) => g?.id === groupId))
      .filter((g): g is Group => g !== undefined);
  }, [invite.auto_groups, groups, isLoading]);

  if (isLoading) {
    return (
      <div className={"flex gap-2"}>
        <Skeleton height={34} width={90} />
        <Skeleton height={34} width={45} />
      </div>
    );
  }

  return (
    <MultipleGroups
      groups={foundGroups}
      label={"Auto-assigned Groups"}
    />
  );
}

// Status cell for invites - shows Valid/Expired based on expired field
function InviteStatusCell({ invite }: { invite: UserInviteListItem }) {
  const isExpired = invite.expired;
  const text = isExpired ? "Expired" : "Valid";
  const color = isExpired ? "bg-red-500" : "bg-green-500";

  return (
    <div
      className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
      data-cy={"invite-status-cell"}
    >
      <span className={cn("h-2 w-2 rounded-full", color)}></span>
      {text}
    </div>
  );
}

// Action cell for invites - delete invite
function InviteActionCell({ invite }: { invite: UserInviteListItem }) {
  const { confirm } = useDialog();
  const { permission } = usePermissions();
  const inviteRequest = useApiCall<UserInviteListItem>("/users/invites");
  const { mutate } = useSWRConfig();

  const deleteInvite = async () => {
    const name = invite.name || invite.email || "Invite";
    notify({
      title: `'${name}' deleted`,
      description: "Invite was successfully deleted.",
      promise: inviteRequest.del("", `/${invite.id}`).then(() => {
        mutate("/users/invites");
      }),
      loadingMessage: "Deleting the invite...",
    });
  };

  const openConfirm = async () => {
    const name = invite.name || invite.email || "Invite";
    const choice = await confirm({
      title: `Delete invite for '${name}'?`,
      description:
        "Deleting this invite will revoke the invite link. The user will no longer be able to join using this invite.",
      confirmText: "Delete",
      cancelText: "Cancel",
      maxWidthClass: "max-w-md",
      type: "danger",
    });
    if (!choice) return;
    deleteInvite().then();
  };

  return (
    <div className={"flex justify-end pr-4 items-center gap-2"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={openConfirm}
        data-cy={"delete-invite"}
        disabled={!permission.users.delete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
    </div>
  );
}

export const InvitesTableColumns: ColumnDef<UserInviteListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Name</DataTableHeader>;
    },
    accessorFn: (row) => row.name + " " + row.email,
    sortingFn: "text",
    cell: ({ row }) => <InviteNameCell invite={row.original} />,
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Role</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <InviteRoleCell invite={row.original} />,
  },
  {
    accessorKey: "expired",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Status</DataTableHeader>;
    },
    sortingFn: "basic",
    cell: ({ row }) => <InviteStatusCell invite={row.original} />,
  },
  {
    accessorKey: "auto_groups",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Groups</DataTableHeader>;
    },
    sortingFn: "text",
    cell: ({ row }) => <InviteGroupCell invite={row.original} />,
  },
  {
    id: "regenerate",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Regenerate</DataTableHeader>;
    },
    cell: ({ row }) => <InviteRegenerateCell invite={row.original} />,
  },
  {
    accessorKey: "expires_at",
    header: ({ column }) => {
      return <DataTableHeader column={column}>Expires</DataTableHeader>;
    },
    sortingFn: "datetime",
    cell: ({ row }) => (
      <span className="text-nb-gray-400">
        {dayjs(row.original.expires_at).format("D MMM, YYYY")}
      </span>
    ),
  },
  {
    accessorKey: "id",
    header: "",
    sortingFn: "text",
    cell: ({ row }) => <InviteActionCell invite={row.original} />,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
  onShowUsers?: () => void;
};

export default function UserInvitesTable({
  headingTarget,
  onShowUsers,
}: Readonly<Props>) {
  useFetchApi("/groups");
  const { data: invites, isLoading } = useFetchApi<UserInviteListItem[]>("/users/invites");
  const { mutate } = useSWRConfig();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-invites" + path,
    [
      {
        id: "is_current",
        desc: true,
      },
      {
        id: "name",
        desc: true,
      },
    ],
  );

  return (
    <DataTable
      headingTarget={headingTarget}
      isLoading={isLoading}
      text={"Invites"}
      sorting={sorting}
      setSorting={setSorting}
      columns={InvitesTableColumns}
      data={invites}
      searchPlaceholder={"Search by name or email..."}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<Link2 className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"No Pending Invites"}
          description={
            "There are no pending invites. Create an invite to add users to your network."
          }
          learnMore={
            <>
              Learn more about
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/add-users-to-your-network"
                }
                target={"_blank"}
              >
                Users
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => (
        <InviteUserButton
          show={invites && invites?.length > 0}
          className={"ml-auto"}
        />
      )}
    >
      {(table) => {
        return (
          <>
            <DataTableRowsPerPage table={table} disabled={invites?.length == 0} />
            <DataTableRefreshButton
              isDisabled={invites?.length == 0}
              onClick={() => {
                mutate("/users/invites");
              }}
            />
            <Button variant={"secondary"} onClick={onShowUsers}>
              <User2 size={14} />
              Show Users
            </Button>
          </>
        );
      }}
    </DataTable>
  );
}

type InviteUserButtonProps = {
  show?: boolean;
  className?: string;
  groups?: Group[];
};

export const InviteUserButton = ({
  show = false,
  className,
  groups,
}: InviteUserButtonProps) => {
  const { permission } = usePermissions();
  const account = useAccount();

  if (!show) return null;

  // On cloud: always show "Invite User"
  // On self-hosted: only show when embedded_idp_enabled is true
  const isCloud = isNetBirdHosted();
  const embeddedIdpEnabled = account?.settings.embedded_idp_enabled;

  if (!isCloud && !embeddedIdpEnabled) return null;

  return (
    <UserInviteModal groups={groups}>
      <Button
        variant={"primary"}
        className={className}
        disabled={!permission.users.create}
      >
        <MailPlus size={16} />
        {isCloud ? "Invite User" : "Add User"}
      </Button>
    </UserInviteModal>
  );
};

