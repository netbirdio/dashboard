import Button from "@components/Button";
import { Table } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

interface Props<TData> {
  table: Table<TData>;
}
export default function DataTableMultiSelectActions<TData>({
  table,
}: Props<TData>) {
  return table.getFilteredSelectedRowModel().rows.length > 0 ? (
    <div>
      <Button variant={"danger-outline"}>
        <Trash2 size={16} />
        Revoke {table.getFilteredSelectedRowModel().rows.length} Key(s)
      </Button>
    </div>
  ) : null;
}
