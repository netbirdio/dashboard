import { ArrowUpRightIcon } from "lucide-react";
import * as React from "react";
import { SiClaude, SiClaudecode, SiCursor } from "react-icons/si";
import { VscVscode } from "react-icons/vsc";
import OpenAIIcon from "@/assets/icons/OpenAIIcon";
import { McpClientId } from "@/modules/mcp/mcp";

type Props = {
  client: McpClientId;
  size?: number;
  // Draws the mark in its brand colour instead of the neutral one.
  colored?: boolean;
};

const NEUTRAL = "text-nb-gray-600 dark:text-nb-gray-100 shrink-0";
const NEUTRAL_FILL = "fill-nb-gray-600 dark:fill-nb-gray-100 shrink-0";
// OpenAI and Cursor publish their marks in black or white only.
const MONO = "text-black dark:text-white shrink-0";
const MONO_FILL = "fill-black dark:fill-white shrink-0";
const CLAUDE = "#D97757";
const VSCODE = "#0098FF";

export default function McpClientIcon({
  client,
  size = 24,
  colored = false,
}: Readonly<Props>) {
  const mono = colored ? MONO : NEUTRAL;
  const brand = (color: string) =>
    colored ? { color } : { className: NEUTRAL };

  switch (client) {
    case "claude-code":
      return <SiClaudecode size={size} {...brand(CLAUDE)} />;
    case "claude":
      return <SiClaude size={size} {...brand(CLAUDE)} />;
    case "codex":
      return (
        <OpenAIIcon
          size={size}
          className={colored ? MONO_FILL : NEUTRAL_FILL}
        />
      );
    case "cursor":
      return <SiCursor size={size} className={mono} />;
    case "vscode":
      return <VscVscode size={size} {...brand(VSCODE)} />;
    case "gemini":
      return <GeminiIcon size={size} colored={colored} />;
    default:
      return <ArrowUpRightIcon size={size} className={NEUTRAL} />;
  }
}

// Drawn here rather than taken from an icon set, so the gradient lives in the
// same SVG as the shape it fills and renders sharp at any size.
function GeminiIcon({
  size,
  colored,
}: Readonly<{ size: number; colored: boolean }>) {
  const id = React.useId();
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 24 24"}
      width={size}
      height={size}
      className={colored ? "shrink-0" : NEUTRAL}
      aria-hidden={true}
    >
      {colored && (
        <defs>
          <linearGradient id={id} x1={"0"} y1={"1"} x2={"1"} y2={"0"}>
            <stop offset={"0%"} stopColor={"#4285F4"} />
            <stop offset={"55%"} stopColor={"#9B72CB"} />
            <stop offset={"100%"} stopColor={"#D96570"} />
          </linearGradient>
        </defs>
      )}
      <path
        fill={colored ? `url(#${id})` : "currentColor"}
        d={
          "M12 0c0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12 0-6.627-5.373-12-12-12 6.627 0 12-5.373 12-12Z"
        }
      />
    </svg>
  );
}
