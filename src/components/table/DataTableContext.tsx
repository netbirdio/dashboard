"use client";

import type { Table as TanStackTable } from "@tanstack/table-core";
import React, { createContext, useContext } from "react";

const DataTableInstanceContext = createContext<TanStackTable<any> | null>(null);

type ProviderProps = {
  table: TanStackTable<any>;
  children: React.ReactNode;
};

export function DataTableInstanceProvider({ table, children }: ProviderProps) {
  return (
    <DataTableInstanceContext.Provider value={table}>
      {children}
    </DataTableInstanceContext.Provider>
  );
}

/**
 * Returns the tanstack table instance of the surrounding DataTable.
 */
export function useDataTable() {
  const table = useContext(DataTableInstanceContext);
  if (!table) {
    throw new Error(
      "useDataTable must be used within a DataTableInstanceProvider",
    );
  }
  return table;
}
