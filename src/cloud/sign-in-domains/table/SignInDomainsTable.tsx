import Card from "@components/Card";
import { DataTable } from "@components/table/DataTable";
import DataTableHeader from "@components/table/DataTableHeader";
import NoResults from "@components/ui/NoResults";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { cn } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import DomainActionCell from "@/cloud/sign-in-domains/table/DomainActionCell";
import DomainStatusCell from "@/cloud/sign-in-domains/table/DomainStatusCell";
import { SignInDomain } from "@/interfaces/Account";

type Props = {
  domains?: SignInDomain[];
};

const SignInDomainsColumns: ColumnDef<SignInDomain>[] = [
  {
    header: ({ column }) => {
      return <DataTableHeader column={column}>Domain</DataTableHeader>;
    },
    accessorKey: "name",
    sortingFn: "text",
    cell: ({ row }) => (
      <div className={"text-sm text-nb-gray-100"}>{row.original.name}</div>
    ),
  },
  {
    header: ({ column }) => {
      return <DataTableHeader column={column}>Status</DataTableHeader>;
    },
    accessorKey: "validation_status",
    sortingFn: "text",
    cell: ({ row }) => <DomainStatusCell domain={row.original} />,
  },
  {
    accessorKey: "id",
    header: () => null,
    enableSorting: false,
    cell: ({ row }) => <DomainActionCell domain={row.original} />,
  },
];

export default function SignInDomainsTable({ domains }: Readonly<Props>) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "name",
      desc: false,
    },
  ]);

  return (
    <DataTable
      wrapperComponent={Card}
      wrapperProps={{ className: "w-full" }}
      useRowId={true}
      sorting={sorting}
      setSorting={setSorting}
      minimal={true}
      showSearchAndFilters={false}
      inset={false}
      tableClassName={"mt-0"}
      rowClassName={"last:mb-5"}
      text={"Domains"}
      columns={SignInDomainsColumns}
      keepStateInLocalStorage={false}
      data={domains}
      getStartedCard={
        <NoResults
          className={"py-4"}
          hideIcon
          title={"No sign-in domains yet"}
          description={
            "Add a domain above, then verify ownership with a DNS record to start matching users to this account."
          }
        />
      }
      paginationPaddingClassName={"px-0 pt-8"}
    />
  );
}

// DataTable renders a six-row skeleton of its own while loading, which
// overshoots a table that usually holds one or two domains. This one keeps the
// placeholder the size of the real thing.
export function SignInDomainsTableSkeleton() {
  return (
    <Card className={"w-full"}>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className={cn(
            row % 2 === 0 ? "bg-nb-gray-940" : "bg-nb-gray-940/40",
            "h-[55px] w-full flex items-center px-8 gap-10",
          )}
        >
          <Skeleton height={10} containerClassName={"flex-1"} />
          <Skeleton height={10} containerClassName={"flex-1"} />
          <Skeleton height={10} containerClassName={"flex-1"} />
        </div>
      ))}
    </Card>
  );
}
