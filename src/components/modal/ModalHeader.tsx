import Paragraph from "@components/Paragraph";
import SquareIcon, { IconVariant } from "@components/SquareIcon";
import { cn } from "@utils/helpers";
import React from "react";

interface Props extends IconVariant {
  icon?: React.ReactNode;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  className?: string;
  margin?: string;
  truncate?: boolean;
  children?: React.ReactNode;
}
export default function ModalHeader({
  icon,
  title,
  description,
  color = "netbird",
  className = "pb-6 px-8",
  margin = "mt-0",
  truncate = false,
  children,
}: Props) {
  return (
    <div className={cn(className, "min-w-0")}>
      <div className={"flex items-start gap-5 pr-10 min-w-0"}>
        {icon && <SquareIcon color={color} icon={icon} />}
        <div className={"min-w-0"}>
          <h2 className={"text-lg my-0 leading-[1.5]"}>{title}</h2>
          {children ? (
            <>{children}</>
          ) : (
            <Paragraph
              className={cn("text-sm", margin, truncate && "!block truncate")}
            >
              {description}
            </Paragraph>
          )}
        </div>
      </div>
    </div>
  );
}
