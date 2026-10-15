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
