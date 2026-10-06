import chroma from "chroma-js";
import type { CSSProperties } from "react";

type AvatarStyle = CSSProperties & {
  "--avatar-color": string;
  "--avatar-foreground": string;
};

export function getAvatarStyle(color: string): AvatarStyle {
  return {
    "--avatar-color": color,
    "--avatar-foreground":
      chroma.contrast(color, "white") > chroma.contrast(color, "black")
        ? "#ffffff"
        : "#000000",
  };
}
