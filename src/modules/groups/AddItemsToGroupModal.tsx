import { Modal, ModalContent, ModalTrigger } from "@/components/modal/Modal";
import { Peer } from "@/interfaces/Peer";
import { ReactNode, useMemo, useState } from "react";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import ModalHeader from "@/components/modal/ModalHeader";
import { DataTable } from "@/components/table/DataTable";
import PeerIcon from "@/assets/icons/PeerIcon";
import Button from "@/components/Button";
import NoResults from "@/components/ui/NoResults";
import Card from "@components/Card";
import { User } from '@/interfaces/User'
import { Policy } from '@/interfaces/Policy'
import { NetworkResource } from '@/interfaces/Network'
import { Route } from "@/interfaces/Route";
import { NameserverGroup } from '@/interfaces/Nameserver'
import { SetupKey } from '@/interfaces/SetupKey'
import { IconCirclePlus } from "@tabler/icons-react";

type ItemType = Peer | User | Policy | NetworkResource | Route | NameserverGroup | SetupKey;


type Props<T extends ItemType> = {
  groupName: string;
  handleAddItem: (dataId: T[]) => void
  items: T[]
  itemIcon: ReactNode
  fetchAllItems: () => { isLoading: boolean, data?: T[] }
  itemName: string
  itemTableColumns: ColumnDef<T>[]
};


export function AddItemsToGroup<T extends ItemType>({ groupName, items, itemName, itemIcon, itemTableColumns, fetchAllItems, handleAddItem }: Props<T>) {
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState([{ id: "select", desc: false }, { id: "name", desc: false }]);

  const { isLoading, data } = fetchAllItems()

  const availableItems = useMemo(() => {

    if (!data || data.length === 0) return []
    if (!items || items.length === 0) return data;
    const existingItemIds = items.map(i => i.id!)
    const available = data.filter(d => !existingItemIds.includes(d.id!))
    return available
  }, [data, items]);


  return (
    <Modal>
      <ModalTrigger asChild>
        <Button
          variant="primary"
          className="ml-auto"
        >
          <IconCirclePlus size={14} className="mr-2" />
          Add {groupName}
        </Button>
      </ModalTrigger>
      <ModalContent
        maxWidthClass={"max-w-4xl"}
        showClose={true}
      >
        <ModalHeader
          title={
            <div className={"flex items-center gap-2 mb-1 text-nb-gray-100"}>
              {itemIcon}
              <span>Add {itemName} to {groupName}</span>
            </div>
          }
          description={`Select ${itemName} to add to this group`}
        />
        <div className="px-8">
          <DataTable
            wrapperComponent={Card}
            wrapperProps={{ className: "mt-6 w-full" }}
            useRowId={true}
            setSorting={setSorting}
            showSearchAndFilters={true}
            inset={false}
            tableClassName={"mt-0"}
            keepStateInLocalStorage={false}
            isLoading={isLoading}
            paginationPaddingClassName={"px-0 pt-8"}
            rowSelection={selectedRows}
            setRowSelection={setSelectedRows}
            onRowClick={(row) => row.toggleSelected()}
            text={`Available ${itemName}`}
            resetRowSelectionOnSearch={false}
            sorting={sorting}
            columns={itemTableColumns}
            data={availableItems}
            searchPlaceholder={"Search by name, IP or owner..."}
            minimal={true}
            columnVisibility={{
              connected: false,
              approval_required: false,
              group_name_strings: false,
              group_names: false,
              ip: false,
              user_name: false,
              user_email: false,
            }}
            getStartedCard={
              <NoResults
                className={"py-4"}
                title={`No available ${itemName} to add`}
                description={`All ${itemName} are already in this group or you don't have any ${itemName}.`}
                icon={<PeerIcon size={20} className={"fill-nb-gray-300"} />}
              />
            }
            rightSide={(table) => (
              <div className={"ml-auto flex items-center gap-5"}>
                <div className={"text-sm"}>
                  {availableItems.length > 0 && Object.keys(selectedRows).length > 0 && (
                    <div className={"text-nb-gray-200"}>
                      <span className={"text-netbird font-medium"}>
                        {Object.keys(selectedRows).length}
                      </span>{" "}
                      Peer(s) selected
                    </div>
                  )}
                </div>
                <Button
                  variant={"primary"}
                  className={"ml-auto"}
                  disabled={availableItems.length === 0 || Object.keys(selectedRows).length === 0}
                  onClick={() => {
                    const selectedPeers = table
                      .getSelectedRowModel()
                      .rows.map((row) => row.original);
                    handleAddItem(selectedPeers);
                    setSelectedRows({})
                  }}
                >
                  Add Selected Peers
                </Button>
              </div>
            )}
          />
        </div>
      </ModalContent>
    </Modal>
  );
};
