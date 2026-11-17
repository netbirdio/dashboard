/**
 * Control Center canvas colours, keyed by the resolved theme.
 *
 * Both backgrounds are nb-gray ramp tokens matching the app background in
 * their respective themes. The dark dot grid is a fixed neutral that is
 * not on the (cool) dark ramp; light uses the ramp stop of the same weight.
 *
 * Anything drawn over an edge to mask it (AnimatedLine's label pill) must use
 * canvasBackground so it stays invisible against the canvas.
 */
export type ResolvedTheme = "light" | "dark";

export const canvasBackground = (theme: ResolvedTheme): string =>
  theme === "light" ? "rgb(var(--nb-gray-940))" : "rgb(var(--nb-gray-950))";

export const canvasDotColor = (theme: ResolvedTheme): string =>
  theme === "light" ? "rgb(var(--nb-gray-600))" : "#717171";

/*
 * Neutral edge strokes. Dark keeps the fixed greys the canvas has always
 * used (like the dot grid, they are not on the cool dark ramp); light uses a
 * ramp stop. Edges set these inline, not as stroke-* utilities: xyflow's
 * .react-flow__edge-path sets stroke and loads after the Tailwind utilities.
 */

/** Disabled policy edges (DirectionIn, SmartEdge). */
export const canvasDisabledEdgeStroke = (theme: ResolvedTheme): string =>
  theme === "light" ? "rgb(var(--nb-gray-700))" : "#787878";

/** Group-to-member connections (SimpleConnection). */
export const canvasConnectionStroke = (theme: ResolvedTheme): string =>
  theme === "light" ? "rgb(var(--nb-gray-700))" : "#7d7d7d";
