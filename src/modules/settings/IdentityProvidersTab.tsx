import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import * as Tabs from "@radix-ui/react-tabs";
import useFetchApi, { useApiCall } from "@utils/api";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  FingerprintIcon,
  KeyRound,
  MoreVertical,
  PencilIcon,
  PlusCircle,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getSSOIdentityProviderLabelByType,
  SSOIdentityProvider,
  SSOIdentityProviderType,
} from "@/interfaces/IdentityProvider";
import IdentityProviderModal from "@/modules/settings/IdentityProviderModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { idpIcon } from "@/assets/icons/IdentityProviderIcons";

export const idpTypeLabels: Record<SSOIdentityProviderType, string> = {
  oidc: "OIDC",
  zitadel: "Zitadel",
  entra: "Microsoft Entra",
  google: "Google",
  okta: "Okta",
  pocketid: "PocketID",
  microsoft: "Microsoft",
  authentik: "Authentik",
  keycloak: "Keycloak",
};

type ActionCellProps = {
  provider: SSOIdentityProvider;
  onEdit: (provider: SSOIdentityProvider) => void;
};

function ActionCell({ provider, onEdit }: ActionCellProps) {
  const { confirm } = useDialog();
  const { mutate } = useSWRConfig();
  const deleteRequest = useApiCall<SSOIdentityProvider>(
    "/identity-providers/" + provider.id,
  );
  const { permission } = usePermissions();

  const handleDelete = async () => {
    const choice = await confirm({
      title: `Delete '${provider.name}'?`,
      description:
        "Are you sure you want to delete this identity provider? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!choice) return;

    notify({
      title: "Delete Identity Provider",
      description: "Identity provider was deleted successfully.",
      promise: deleteRequest.del().then(() => {
        mutate("/identity-providers");
      }),
      loadingMessage: "Deleting identity provider...",
    });
  };

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="p-2">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onEdit(provider)}
            disabled={!permission.settings.update}
          >
            <PencilIcon size={14} className="mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={!permission.settings.update}
            className="text-red-500 focus:text-red-500"
          >
            <Trash2 size={14} className="mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function IdentityProvidersTab() {
  const { permission } = usePermissions();
  const { mutate } = useSWRConfig();
  const { data: providers, isLoading } = useFetchApi<SSOIdentityProvider[]>(
    "/identity-providers",
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<SSOIdentityProvider | null>(
    null,
  );

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-identity-providers",
    [
      {
        id: "name",
        desc: false,
      },
    ],
  );

  const handleEdit = (provider: SSOIdentityProvider) => {
    setEditProvider(provider);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditProvider(null);
  };

  const columns: ColumnDef<SSOIdentityProvider>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {idpIcon(row.original.type) || (
            <KeyRound size={16} className="text-nb-gray-400" />
          )}
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableHeader column={column}>Type</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-nb-gray-400">
          {getSSOIdentityProviderLabelByType(row.original.type)}
        </span>
      ),
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => (
        <ActionCell provider={row.original} onEdit={handleEdit} />
      ),
    },
  ];

  return (
    <Tabs.Content value={"identity-providers"} className={"w-full"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=identity-providers"}
            label={"Identity Providers"}
            icon={<FingerprintIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>Identity Providers</h1>
            <Paragraph>
              Configure identity providers for user authentication in your
              network.
            </Paragraph>
          </div>
        </div>
      </div>

      <IdentityProviderModal
        open={modalOpen}
        key={modalOpen ? 1 : 0}
        onClose={handleCloseModal}
        provider={editProvider}
      />

      <DataTable
        isLoading={isLoading}
        text={"Identity Providers"}
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={providers}
        onRowClick={(row) => handleEdit(row.original)}
        searchPlaceholder={"Search by name or type..."}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<FingerprintIcon size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"Add Identity Provider"}
            description={
              "Configure an identity provider to enable SSO authentication for your users."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => setModalOpen(true)}
                disabled={!permission.settings.update}
              >
                <PlusCircle size={16} />
                Add Identity Provider
              </Button>
            }
          />
        }
        rightSide={() => (
          <>
            {providers && providers.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setModalOpen(true)}
                disabled={!permission.settings.update}
              >
                <PlusCircle size={16} />
                Add Identity Provider
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={!providers || providers.length === 0}
            />
            <DataTableRefreshButton
              isDisabled={!providers || providers.length === 0}
              onClick={() => mutate("/identity-providers")}
            />
          </>
        )}
      </DataTable>
    </Tabs.Content>
  );
}
