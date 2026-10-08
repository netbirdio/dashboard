import chroma from "chroma-js";
import type { CSSProperties } from "react";

type AvatarStyle = CSSProperties & {
  "--avatar-color": string;
  "--avatar-background": string;
  "--avatar-foreground": string;
};

export function getAvatarStyle(color: string): AvatarStyle {
  const background = chroma.mix(color, "white", 0.3, "rgb").hex();

  return {
    "--avatar-color": color,
    "--avatar-background": background,
    "--avatar-foreground":
      chroma.contrast(background, "white") > chroma.contrast(background, "black")
        ? "#ffffff"
        : "#000000",
  };
}
