import * as React from "react";

export interface StepCommand {
    key: number | string,
    title: string,
    commands: React.ReactNode | string | null,
    copied?: boolean,
    showCopyButton?: boolean
}