import Button from "@components/Button";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import { Table } from "@tanstack/react-table";
import * as React from "react";
import { useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type Props<T> = {
  table: Table<T>;
  data?: T[];
  count?: number;
};

export const PendingApprovalFilter = <T,>({ table, data, count }: Props<T>) => {
  const { t } = useI18n();
  // Reset filter if there are no pending approvals
  useEffect(() => {
    if (
      count == 0 &&
      table.getColumn("approval_required")?.getFilterValue() === true
    ) {
      table.setColumnFilters([]);
    }
  }, [count, table]);

  if (!count) return;
  return (
    <Button
      disabled={data?.length == 0}
      onClick={() => {
        table.setPageIndex(0);
        let current =
          table.getColumn("approval_required")?.getFilterValue() === undefined
            ? true
            : undefined;

        table.setColumnFilters([
          {
            id: "approval_required",
            value: current,
          },
        ]);
      }}
      variant={
        table.getColumn("approval_required")?.getFilterValue() === true
          ? "tertiary"
          : "secondary"
      }
    >
      {t("users.pendingApprovals")}
      <NotificationCountBadge count={count} />
    </Button>
  );
};
