import Code from "@components/Code";
import * as React from "react";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits a command into code lines and colours each highlighted value. */
export const renderHighlightedCommand = (
  command: string,
  highlights: string[],
) => {
  const valid = highlights.filter((h) => h && h.trim().length > 0);
  const pattern =
    valid.length > 0
      ? new RegExp(`(${valid.map(escapeRegExp).join("|")})`, "g")
      : null;

  return command.split("\n").map((line, lineIndex) => (
    <Code.Line key={lineIndex}>
      {pattern
        ? line.split(pattern).map((part, partIndex) =>
            valid.includes(part) ? (
              <span key={partIndex} className={"text-netbird"}>
                {part}
              </span>
            ) : (
              part
            ),
          )
        : line}
    </Code.Line>
  ));
};
