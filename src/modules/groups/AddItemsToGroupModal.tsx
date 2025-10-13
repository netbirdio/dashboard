import { Modal, ModalContent, ModalTrigger } from "@/components/modal/Modal";
import { Peer } from "@/interfaces/Peer";
import { ReactNode, useMemo, useState } from "react";
import { ColumnDef, RowSelectionState, Table } from "@tanstack/react-table";
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
import { Label } from "@/components/Label";
import HelpText from "@/components/HelpText";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

type ItemType = Peer | User | Policy | NetworkResource | Route | NameserverGroup | SetupKey;

type Props<T extends ItemType> = {
  groupName: string;
  handleAddItem: (dataId: T[], options?: { isSource?: boolean }) => void
  items: T[]
  itemIcon: ReactNode
  fetchAllItems: () => { isLoading: boolean, data?: T[] }
  itemName: string
  itemTableColumns: ColumnDef<T>[]
  showSourceDestinationSwitch?: boolean
};

export function AddItemsToGroup<T extends ItemType>({ 
  groupName, 
  items, 
  itemName, 
  itemIcon, 
  itemTableColumns, 
  fetchAllItems, 
  handleAddItem,
  showSourceDestinationSwitch = false 
}: Props<T>) {
  const [selectedRows, setSelectedRows] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState([{ id: "select", desc: false }, { id: "name", desc: false }]);
  const [isSource, setIsSource] = useState(true);

  const { isLoading, data } = fetchAllItems()

  const availableItems = useMemo(() => {
    if (!data || data.length === 0) return []
    if (!items || items.length === 0) return data;
    const existingItemIds = items.map(i => i.id!)
    const available = data.filter(d => !existingItemIds.includes(d.id!))
    return available
  }, [data, items]);

  const handleAddClick = (table: Table<T>) => {
    const selectedItems = table
      .getSelectedRowModel()
      .rows.map((row: any) => row.original);
    
    if (showSourceDestinationSwitch) {
      handleAddItem(selectedItems, { isSource });
    } else {
      handleAddItem(selectedItems);
    }
    
    setSelectedRows({});
  };

  return (
    <Modal>
      <ModalTrigger asChild>
        <Button
          variant="primary"
          className="ml-auto"
        >
          <IconCirclePlus size={14} className="mr-2" />
          Add {itemName}
        </Button>
      </ModalTrigger>
      <ModalContent
        maxWidthClass={"max-w-6xl"}
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
        
        {/* Source/Destination Switch for Policies */}
        {showSourceDestinationSwitch && (
          <div className="px-8 pb-4">
            <div className="flex items-center justify-between p-4 border border-nb-gray-700 rounded-lg bg-nb-gray-900/50">
              <div className="flex-1">
                <Label className="text-sm font-medium">Policy Role</Label>
                <HelpText className="text-xs mt-1">
                  Choose whether this group will be the source (initiator) or destination (target) in the policy rules
                </HelpText>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Modern Switch with Labels */}
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium transition-colors ${
                    isSource ? 'text-netbird' : 'text-nb-gray-400'
                  }`}>
                    Source
                  </span>
                  
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isSource}
                    onClick={() => setIsSource(!isSource)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-all
                      ${isSource ? 'bg-netbird/60' : 'bg-nb-gray-600'}
                      hover:bg-netbird/80 focus:outline-none focus:ring-2 focus:ring-netbird focus:ring-offset-2 focus:ring-offset-nb-gray-900
                    `}
                  >
                    <span className="sr-only">
                      {isSource ? 'Switch to destination' : 'Switch to source'}
                    </span>
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${isSource ? 'translate-x-6' : 'translate-x-1'}
                        shadow-lg
                      `}
                    />
                  </button>
                  
                  <span className={`text-sm font-medium transition-colors ${
                    !isSource ? 'text-netbird' : 'text-nb-gray-400'
                  }`}>
                    Destination
                  </span>
                </div>
                
                {/* Visual Indicator */}
                <div className={`
                  px-3 py-1 rounded-full text-xs font-medium border
                  ${isSource 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }
                `}>
                  {isSource ? (
                    <div className="flex items-center gap-2">
                      <ArrowRightIcon size={12} />
                      <span>Initiates Connections</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowLeftIcon size={12} />
                      <span>Receives Connections</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
            searchPlaceholder={`Search by name...`}
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
                      {itemName}(s) selected
                    </div>
                  )}
                </div>
                <Button
                  variant={"primary"}
                  className={"ml-auto"}
                  disabled={availableItems.length === 0 || Object.keys(selectedRows).length === 0}
                  onClick={() => handleAddClick(table)}
                >
                  {showSourceDestinationSwitch ? (
                    <>Add as {isSource ? 'Source' : 'Destination'}</>
                  ) : (
                    `Add Selected ${itemName}`
                  )}
                </Button>
              </div>
            )}
          />
        </div>
      </ModalContent>
    </Modal>
  );
};
