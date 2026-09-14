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
 * Returns the tanstack table instance for the surrounding DataTable, or null
 * when used outside of one.
 */
export function useOptionalDataTable() {
  return useContext(DataTableInstanceContext);
}
