import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import InlineLink from "@components/InlineLink";
import SquareIcon from "@components/SquareIcon";
import { DataTable } from "@components/table/DataTable";
import DataTableRefreshButton from "@components/table/DataTableRefreshButton";
import { DataTableRowsPerPage } from "@components/table/DataTableRowsPerPage";
import GetStartedTest from "@components/ui/GetStartedTest";
import { SortingState } from "@tanstack/react-table";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import { useSWRConfig } from "swr";
import SetupKeysIcon from "@/assets/icons/SetupKeysIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SetupKey } from "@/interfaces/SetupKey";
import SetupKeyModal from "@/modules/setup-keys/SetupKeyModal";
import { SetupKeysTableColumns } from "@/modules/setup-keys/SetupKeysTableColumns";

type Props = {
  setupKeys?: SetupKey[];
  isLoading: boolean;
};
export default function SetupKeysTable({ setupKeys, isLoading }: Props) {
  const { mutate } = useSWRConfig();
  const path = usePathname();

  // Default sorting state of the table
  const [sorting, setSorting] = useLocalStorage<SortingState>(
    "netbird-table-sort" + path,
    [
      {
        id: "valid",
        desc: true,
      },
      {
        id: "type",
        desc: true,
      },
      {
        id: "last_used",
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
      isLoading={isLoading}
      text={"Setup Keys"}
      sorting={sorting}
      setSorting={setSorting}
      columns={SetupKeysTableColumns}
      data={setupKeys}
      searchPlaceholder={"Search by name, type or group..."}
      columnVisibility={{
        valid: false,
        group_strings: false,
      }}
      getStartedCard={
        <GetStartedTest
          icon={
            <SquareIcon
              icon={<SetupKeysIcon className={"fill-nb-gray-200"} size={20} />}
              color={"gray"}
              size={"large"}
            />
          }
          title={"Create Setup Key"}
          description={
            "Add a setup key to register new machines in your network. The key links machines to your account during initial setup."
          }
          button={
            <SetupKeyModal>
              <Button variant={"primary"} className={""}>
                <PlusCircle size={16} />
                Create Setup Key
              </Button>
            </SetupKeyModal>
          }
          learnMore={
            <>
              Learn more about
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
                }
                target={"_blank"}
              >
                Setup Keys
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </>
          }
        />
      }
      rightSide={() => (
        <>
          {setupKeys && setupKeys?.length > 0 && (
            <SetupKeyModal>
              <Button variant={"primary"} className={"ml-auto"}>
                <PlusCircle size={16} />
                Create Setup Key
              </Button>
            </SetupKeyModal>
          )}
        </>
      )}
    >
      {(table) => (
        <>
          <ButtonGroup disabled={setupKeys?.length == 0}>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("valid")?.setFilterValue(true);
              }}
              disabled={setupKeys?.length == 0}
              variant={
                table.getColumn("valid")?.getFilterValue() == true
                  ? "tertiary"
                  : "secondary"
              }
            >
              Valid
            </ButtonGroup.Button>
            <ButtonGroup.Button
              onClick={() => {
                table.setPageIndex(0);
                table.getColumn("valid")?.setFilterValue("");
              }}
              disabled={setupKeys?.length == 0}
              variant={
                table.getColumn("valid")?.getFilterValue() != true
                  ? "tertiary"
                  : "secondary"
              }
            >
              All
            </ButtonGroup.Button>
          </ButtonGroup>
          <DataTableRowsPerPage
            table={table}
            disabled={setupKeys?.length == 0}
          />
          <DataTableRefreshButton
            isDisabled={setupKeys?.length == 0}
            onClick={() => {
              mutate("/setup-keys").then();
              mutate("/groups").then();
            }}
          />
        </>
      )}
    </DataTable>
  );
}
