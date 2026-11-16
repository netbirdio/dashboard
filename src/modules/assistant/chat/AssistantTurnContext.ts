"use client";

import { createContext, useContext } from "react";

// Its own module to avoid an import cycle between the thread and the tool rows.
// Defaults to true: a false default would settle every tool row rendered outside a provider.
export const TurnActiveContext = createContext(true);

export const useTurnActive = (): boolean => useContext(TurnActiveContext);
