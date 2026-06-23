import Badge from "@components/Badge";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import MultipleGroups from "@components/ui/MultipleGroups";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import useFetchApi from "@utils/api";
import {
  FingerprintIcon,
  GlobeIcon,
  PlusCircle,
  PowerOffIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  EntraDeviceAuth,
  EntraDeviceMapping,
} from "@/interfaces/EntraDeviceAuth";
import { Group } from "@/interfaces/Group";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import ExpirationDateRow from "@/modules/common-table-rows/ExpirationDateRow";
import EntraDeviceMappingActionCell from "@/modules/integrations/entra-device-auth/EntraDeviceMappingActionCell";
import EntraDeviceMappingModal from "@/modules/integrations/entra-device-auth/EntraDeviceMappingModal";

/**
 * CRUD data-table for Entra device auth mappings.
 *
 * Blocked with a friendly empty state when the integration itself isn't
 * configured yet — the backend refuses to accept mappings in that state
 * (HTTP 409 no_integration) and the admin can't meaningfully create them.
 */
export default function EntraDeviceMappingsTable() {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const { groups: allGroups } = useGroups();

  const { data: integration } = useFetchApi<EntraDeviceAuth>(
    "/integrations/entra-device-auth",
    true,
  );

  const { data: mappings, isLoading } = useFetchApi<EntraDeviceMapping[]>(
    "/integrations/entra-device-auth/mappings",
    true,
  );

  const canRead = permission?.entra_device_auth?.read ?? true;
  const canCreate = permission?.entra_device_auth?.create ?? true;

  const hasIntegration = !!integration?.id;

  // Decorate each mapping with resolved Group objects so the Groups column
  // can render real names rather than bare IDs.
  const decorated = useMemo(() => {
    if (!mappings) return [];
    if (!allGroups) return mappings;
    return mappings.map((m) => ({
      ...m,
      groups: (m.auto_groups ?? [])
        .map((id) => allGroups.find((g) => g.id === id))
        .filter(Boolean) as Group[],
    }));
  }, [mappings, allGroups]);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort-entra-device-mappings",
    [
      { id: "priority", desc: false },
      { id: "name", desc: false },
    ],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editMapping, setEditMapping] = useState<EntraDeviceMapping | null>(
    null,
  );

  const handleCreate = () => {
    setEditMapping(null);
    setModalOpen(true);
  };

  const handleEdit = (mapping: EntraDeviceMapping) => {
    setEditMapping(mapping);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditMapping(null);
  };

  const columns: ColumnDef<EntraDeviceMapping>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableHeader column={column}>Name</DataTableHeader>
      ),
      sortingFn: "text",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <FingerprintIcon size={16} className="text-nb-gray-400" />
          <span className="font-medium">{row.original.name}</span>
          {row.original.revoked && (
            <Badge variant="gray" useHover={false}>
              Revoked
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "entra_group_id",
      header: ({ column }) => (
        <DataTableHeader column={column}>Entra group</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-nb-gray-400 font-mono">
          {row.original.entra_group_id === "*" ? (
            <Badge variant="blue" useHover={false}>
              <GlobeIcon size={12} />
              Any device in tenant
            </Badge>
          ) : (
            row.original.entra_group_id
          )}
        </span>
      ),
    },
    {
      id: "groups",
      accessorFn: (m) => m.auto_groups?.length ?? 0,
      header: ({ column }) => (
        <DataTableHeader column={column}>Auto-groups</DataTableHeader>
      ),
      cell: ({ row }) => (
        <MultipleGroups
          groups={row.original.groups ?? []}
          label="Auto-assigned Groups"
          description="Groups automatically assigned to peers enrolled via this mapping."
        />
      ),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableHeader column={column}>Priority</DataTableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-nb-gray-400">{row.original.priority ?? 0}</span>
      ),
    },
    {
      accessorKey: "ephemeral",
      header: ({ column }) => (
        <DataTableHeader column={column}>Ephemeral</DataTableHeader>
      ),
      cell: ({ row }) =>
        row.original.ephemeral ? (
          <Badge variant="gray" useHover={false}>
            <PowerOffIcon size={12} />
            Ephemeral
          </Badge>
        ) : (
          <EmptyRow />
        ),
    },
    {
      accessorKey: "expires_at",
      header: ({ column }) => (
        <DataTableHeader column={column}>Expires</DataTableHeader>
      ),
      cell: ({ row }) => {
        const exp = row.original.expires_at;
        if (!exp) return <EmptyRow className="px-3" />;
        const d = dayjs(exp);
        if (!d.isValid() || d.year() <= 1) return <EmptyRow className="px-3" />;
        return <ExpirationDateRow date={new Date(exp)} />;
      },
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => (
        <EntraDeviceMappingActionCell
          mapping={row.original}
          onEdit={handleEdit}
        />
      ),
    },
  ];

  if (!canRead) {
    return (
      <Paragraph className="px-6 py-8">
        You don&apos;t have permission to view mappings.
      </Paragraph>
    );
  }

  if (!hasIntegration) {
    return (
      <div className="px-default py-8">
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<FingerprintIcon size={20} />}
              color="gray"
              size="large"
            />
          }
          title="Configure the integration first"
          description="Set up the Entra Device Auth integration (Configuration tab) before adding mappings. The backend refuses mappings while the integration is missing."
        />
      </div>
    );
  }

  return (
    <>
      <EntraDeviceMappingModal
        open={modalOpen}
        onClose={handleCloseModal}
        mapping={editMapping}
        key={modalOpen ? (editMapping?.id ?? "new") : "closed"}
      />
      <DataTable
        isLoading={isLoading}
        text="Mappings"
        sorting={sorting}
        setSorting={setSorting}
        columns={columns}
        data={decorated}
        onRowClick={(row) => handleEdit(row.original)}
        searchPlaceholder="Search by name or Entra group ID..."
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<FingerprintIcon size={20} />}
                color="gray"
                size="large"
              />
            }
            title="Add your first mapping"
            description="Map an Entra security group (or the catch-all '*') to a set of NetBird auto-groups. Peers enrolled via /join/entra will be placed accordingly."
            button={
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!canCreate}
              >
                <PlusCircle size={16} />
                Add mapping
              </Button>
            }
          />
        }
        rightSide={() => (
          <>
            {mappings && mappings.length > 0 && (
              <Button
                variant="primary"
                className="ml-auto"
                onClick={handleCreate}
                disabled={!canCreate}
              >
                <PlusCircle size={16} />
                Add mapping
              </Button>
            )}
          </>
        )}
      >
        {(table) => (
          <>
            <DataTableRowsPerPage
              table={table}
              disabled={!mappings || mappings.length === 0}
            />
            <DataTableRefreshButton
              isDisabled={!mappings || mappings.length === 0}
              onClick={() => {
                mutate("/integrations/entra-device-auth/mappings");
                mutate("/groups");
              }}
            />
          </>
        )}
      </DataTable>
    </>
  );
}
