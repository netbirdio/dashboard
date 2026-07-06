"use client";

import React, { createContext, useContext, useState } from "react";
import { Peer } from "@/interfaces/Peer";
import { NetworkResource } from "@/interfaces/Network";

interface CreateGroupChange {
  type: "create-group";
  name: string;
  peers: Peer[];
  resources: NetworkResource[];
}

export type DraftChange = CreateGroupChange;

interface DraftChangesetContextType {
  changes: DraftChange[];
  addChange: (change: DraftChange) => void;
  removeChange: (index: number) => void;
  clearChanges: () => void;
}

const DraftChangesetContext = createContext<DraftChangesetContextType | null>(
  null,
);

export function useDraftChangeset(): DraftChangesetContextType {
  const ctx = useContext(DraftChangesetContext);
  if (!ctx) {
    throw new Error(
      "useDraftChangeset must be used within DraftChangesetProvider",
    );
  }
  return ctx;
}

export function DraftChangesetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [changes, setChanges] = useState<DraftChange[]>([]);

  const addChange = (change: DraftChange) => {
    setChanges((prev) => [...prev, change]);
  };

  const removeChange = (index: number) => {
    setChanges((prev) => prev.filter((_, i) => i !== index));
  };

  const clearChanges = () => {
    setChanges([]);
  };

  return (
    <DraftChangesetContext.Provider
      value={{ changes, addChange, removeChange, clearChanges }}
    >
      {children}
    </DraftChangesetContext.Provider>
  );
}
