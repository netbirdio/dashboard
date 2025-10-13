import { Peer } from "@/interfaces/Peer";
import Button from "@/components/Button";
import { User } from '@/interfaces/User'
import { Policy } from '@/interfaces/Policy'
import { NetworkResource } from '@/interfaces/Network'
import { Route } from "@/interfaces/Route";
import { NameserverGroup } from '@/interfaces/Nameserver'
import { SetupKey } from '@/interfaces/SetupKey'
import { useDialog } from "@/contexts/DialogProvider";
import { Trash2 } from "lucide-react";

type ItemType = Peer | User | Policy | NetworkResource | Route | NameserverGroup | SetupKey;


type Props<T extends ItemType> = {
  groupName: string;
  handleRemoveItem: (item: T) => void
  item: T
  itemName: string
};

export function RemoveItemsFromGroup<T extends ItemType>({ item, itemName, groupName, handleRemoveItem }: Props<T>) {
  const { confirm } = useDialog();

  const handleConfirm = async () => {
    const choice = await confirm({
      title: `Remove this ${itemName}?`,
      description:
        `Are you sure you want to remove this ${itemName} from ${groupName}`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleRemoveItem(item)
  };

  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"danger-outline"}
        size={"sm"}
        onClick={handleConfirm}
      >
        <Trash2 size={16} />
        Remove
      </Button>
    </div>
  );
}
