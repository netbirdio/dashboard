"use client";

import Button from "@components/Button";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import GetStartedTest from "@components/ui/GetStartedTest";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  ExternalLinkIcon,
  KeyRound,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";
import InlineLink from "@components/InlineLink";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useReverseProxies } from "@/contexts/ReverseProxiesProvider";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Credential } from "@/interfaces/Credential";
import { REVERSE_PROXY_DOCS_LINK } from "@/interfaces/ReverseProxy";
import { CredentialModal } from "@/modules/reverse-proxy/credentials/CredentialModal";
import { getProviderSchema } from "@/modules/reverse-proxy/cert/providers";

const CredentialsColumns: ColumnDef<Credential>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableHeader column={column}>Name</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => (
      <div className={"flex items-center gap-2 ml-2"}>
        <KeyRound size={14} className={"text-nb-gray-200"} />
        <span className={"font-medium"}>{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "provider_type",
    header: ({ column }) => (
      <DataTableHeader column={column}>Provider</DataTableHeader>
    ),
    sortingFn: "text",
    cell: ({ row }) => {
      const schema = getProviderSchema(row.original.provider_type);
      return (
        <span className={"text-sm text-nb-gray-200"}>
          {schema?.label ?? row.original.provider_type}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableHeader column={column}>Created</DataTableHeader>
    ),
    sortingFn: "datetime",
    cell: ({ row }) => (
      <span className={"text-sm text-nb-gray-300"}>
        {dayjs(row.original.created_at).format("MMM D, YYYY")}
      </span>
    ),
  },
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <CredentialActionCell credential={row.original} />,
  },
  {
    id: "searchString",
    accessorFn: (row) => `${row.name} ${row.provider_type}`,
  },
];

type Props = {
  headingTarget?: HTMLHeadingElement | null;
};

export default function CredentialsTable({ headingTarget }: Readonly<Props>) {
  const { mutate } = useSWRConfig();
  const path = usePathname();
  const { permission } = usePermissions();
  const { credentials, isLoadingCredentials } = useReverseProxies();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [{ id: "name", desc: false }],
  );

  const data = useMemo(() => credentials ?? [], [credentials]);

  return (
    <>
      {addModalOpen && (
        <CredentialModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          key={addModalOpen ? 1 : 0}
        />
      )}

      <DataTable
        headingTarget={headingTarget}
        isLoading={isLoadingCredentials}
        inset={false}
        initialPageSize={10000}
        keepStateInLocalStorage={false}
        text={"Credentials"}
        sorting={sorting}
        setSorting={setSorting}
        columns={CredentialsColumns}
        data={data}
        useRowId={true}
        searchPlaceholder={"Search by name or provider..."}
        columnVisibility={{ searchString: false }}
        getStartedCard={
          <GetStartedTest
            icon={
              <SquareIcon
                icon={<KeyRound className={"fill-nb-gray-200"} size={20} />}
                color={"gray"}
                size={"large"}
              />
            }
            title={"Add DNS Credentials"}
            description={
              "Save DNS provider tokens once and reuse them across multiple reverse-proxy services that issue certificates with DNS-01."
            }
            button={
              <Button
                variant={"primary"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                Add Credential
              </Button>
            }
            learnMore={
              <>
                Learn more about
                <InlineLink href={REVERSE_PROXY_DOCS_LINK} target={"_blank"}>
                  Reverse Proxy
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
          />
        }
        rightSide={() => (
          <>
            {data.length > 0 && (
              <Button
                variant={"primary"}
                className={"ml-auto"}
                onClick={() => setAddModalOpen(true)}
                disabled={!permission?.services?.create}
              >
                <PlusCircle size={16} />
                Add Credential
              </Button>
            )}
          </>
        )}
      >
        {() => (
          <DataTableRefreshButton
            isDisabled={data.length === 0}
            onClick={() => {
              mutate("/credentials").then();
            }}
          />
        )}
      </DataTable>
    </>
  );
}

function CredentialActionCell({ credential }: { credential: Credential }) {
  const { permission } = usePermissions();
  const { deleteCredential } = useReverseProxies();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div
      className={"flex justify-end pr-4 gap-2"}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant={"secondary"}
        size={"sm"}
        onClick={() => setEditOpen(true)}
        disabled={!permission?.services?.update}
      >
        <Pencil size={14} />
        Edit
      </Button>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={() => deleteCredential(credential)}
        disabled={!permission?.services?.delete}
      >
        <Trash2 size={16} />
        Delete
      </Button>
      {editOpen && (
        <CredentialModal
          open={editOpen}
          onOpenChange={setEditOpen}
          credential={credential}
          key={editOpen ? `edit-${credential.id}-1` : `edit-${credential.id}-0`}
        />
      )}
    </div>
  );
}
