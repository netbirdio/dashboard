import * as React from "react";

export interface StepCommand {
  key: number | string;
  title: React.ReactNode | string | null;
  commands: React.ReactNode | string | null;
  commandsForCopy?: React.ReactNode | string | null;
  copied?: boolean;
  showCopyButton?: boolean;
}