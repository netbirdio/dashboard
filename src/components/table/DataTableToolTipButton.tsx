import Button from "@components/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import * as React from "react";
import { useState } from "react";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "secondary" | "input" | "dotted" | "tertiary" | "white" | "outline" | "danger-outline" | "default-outline" | "danger" | null | undefined;
  title?:any;
  children: any;
};
export default function DataTableToolTipButton({ onClick, disabled, variant, title, children }: Props) {
  const [rotate, setRotate] = useState(false);
  //const [disabled, setDisabled] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger
        asChild={true}
      >
        <Button
          className={"h-[42px]"}
          variant={variant}
          disabled={disabled == true ? true : disabled}
          onClick={onClick}
        >
            {children}
        </Button>
      </TooltipTrigger>

      <TooltipContent
        sideOffset={10}
        className={"px-3 py-2"}
        onPointerDownOutside={(event) => {
          if (hovered) event.preventDefault();
        }}
      >
        <span className={"text-xs text-neutral-300"}>
          {title}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
