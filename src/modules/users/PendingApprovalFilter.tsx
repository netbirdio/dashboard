import Button from "@components/Button";
import { NotificationCountBadge } from "@components/ui/NotificationCountBadge";
import { Table } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useEffect } from "react";

type Props<T> = {
  table: Table<T>;
  data?: T[];
  count?: number;
};

export const PendingApprovalFilter = <T,>({ table, data, count }: Props<T>) => {
  const t = useTranslations("users");
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
      {t("pendingApproval")}
      <NotificationCountBadge count={count} />
    </Button>
  );
};
