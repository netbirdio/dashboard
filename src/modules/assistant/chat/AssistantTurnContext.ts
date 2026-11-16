"use client";

import { createContext, useContext } from "react";

/**
 * Whether the whole turn is still in flight.
 *
 * A group's own "running" status dies at every stream-step and tool-round
 * boundary, so panel collapsing keys on this instead — one collapse at the
 * end, not one per boundary.
 *
 * Its own module because both the thread that provides it and the tool rows
 * that read it live in files the thread already imports; keeping it here is
 * what stops that becoming a cycle.
 */
/*
  Defaults to true: "in flight" is the conservative answer when nobody has
  said otherwise. A false default would let the mere ABSENCE of a provider
  settle every tool row and collapse every panel, which is a claim the context
  was never asked to make — outside a provider the row's own status should
  decide.
*/
export const TurnActiveContext = createContext(true);

export const useTurnActive = (): boolean => useContext(TurnActiveContext);
