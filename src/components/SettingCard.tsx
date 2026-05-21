"use client";

import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { SmallBadge } from "@components/ui/SmallBadge";
import { cn } from "@utils/helpers";
import { PlusCircle, SquarePen } from "lucide-react";
import React from "react";

type SettingCardItemProps = {
  label: React.ReactNode;
  description: React.ReactNode;
  enabled: boolean;
  onClick: () => void;
  disabled?: boolean;
};

function SettingCardItem({
  label,
  description,
  enabled,
  onClick,
  disabled = false,
}: Readonly<SettingCardItemProps>) {
  const handleClick = () => {
    if (disabled) return;
    onClick();
  };
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex justify-between gap-10 px-6 border-t border-nb-gray-920 first:border-t-0 py-5 transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-nb-gray-935 cursor-pointer",
      )}
    >
      <div className={"max-w-sm"}>
        <div className="flex items-center gap-2">
          <Label>{label}</Label>
          {enabled && (
            <SmallBadge
              text="Enabled"
              variant="green"
              size="md"
              className={"-top-[0.25rem]"}
            />
          )}
        </div>
        <HelpText margin={false}>{description}</HelpText>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {enabled ? (
          <Button
            variant={"secondaryLighter"}
            size={"xs"}
            className={"pl-3 pr-3"}
            onClick={handleClick}
            disabled={disabled}
          >
            <SquarePen size={12} />
            Edit
          </Button>
        ) : (
          <Button
            variant={"secondaryLighter"}
            size={"xs"}
            className={"pl-3 pr-3"}
            onClick={handleClick}
            disabled={disabled}
          >
            <PlusCircle size={12} />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

type SettingCardProps = {
  children: React.ReactNode;
  className?: string;
};

function SettingCard({ children, className }: Readonly<SettingCardProps>) {
  return (
    <div
      className={cn(
        "border-nb-gray-920 bg-nb-gray-800/10 border rounded-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

const SettingCardWithItem = SettingCard as React.FC<Readonly<SettingCardProps>> & {
  Item: typeof SettingCardItem;
};
SettingCardWithItem.Item = SettingCardItem;

export default SettingCardWithItem;
