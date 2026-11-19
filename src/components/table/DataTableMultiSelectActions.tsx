import Button from "@components/Button";
import { Table } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/LocaleProvider";

interface Props<TData> {
  table: Table<TData>;
}
export default function DataTableMultiSelectActions<TData>({
  table,
}: Props<TData>) {
  const t = useTranslations();
  return table.getFilteredSelectedRowModel().rows.length > 0 ? (
    <div>
      <Button variant={"danger-outline"}>
        <Trash2 size={16} />
        {t("tables.revoke") + " "}{table.getFilteredSelectedRowModel().rows.length} Key(s)
      </Button>
    </div>
  ) : null;
}
