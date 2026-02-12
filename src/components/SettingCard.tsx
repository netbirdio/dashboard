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
};

function SettingCardItem({
  label,
  description,
  enabled,
  onClick,
}: Readonly<SettingCardItemProps>) {
  return (
    <div
      onClick={onClick}
      className={
        "flex justify-between gap-10 px-6 border-t border-nb-gray-920 first:border-t-0 py-5 hover:bg-nb-gray-935 cursor-pointer transition-colors"
      }
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
            onClick={onClick}
          >
            <SquarePen size={12} />
            Edit
          </Button>
        ) : (
          <Button
            variant={"secondaryLighter"}
            size={"xs"}
            className={"pl-3 pr-3"}
            onClick={onClick}
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

SettingCard.Item = SettingCardItem;

export default SettingCard;
