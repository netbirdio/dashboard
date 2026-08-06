import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, Repeat } from "lucide-react";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import * as React from "react";
import { useMemo } from "react";

type Props<T> = {
  image: StaticImport | string;
  name: string;
  description: string;
  url: {
    title: string;
    href: string;
  };
  data?: T;
  switchState: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children?: React.ReactNode;
  onSetup?: () => void;
  disabled?: boolean;
  hideSwitch?: boolean;
  customButton?: React.ReactNode;
};

export function IntegrationCard<T>({
  image,
  name,
  description,
  url,
  data,
  switchState,
  onEnabledChange,
  children,
  onSetup,
  disabled,
  hideSwitch = false,
  customButton,
}: Props<T>) {
  const IntegrationButton = useMemo(
    () =>
      customButton ? (
        customButton
      ) : (
        <div>
          <Button
            variant={"secondary"}
            size={"xs"}
            className={"w-full items-center"}
            onClick={onSetup}
          >
            <Repeat size={13} />
            Connect {name}
          </Button>
        </div>
      ),
    [customButton, name],
  );

  return (
    <div
      className={cn(
        " border border-nb-gray-900/50 p-5 rounded-lg transition-all h-full flex flex-col justify-between gap-4",
        switchState ? "bg-nb-gray-930/50" : "bg-nb-gray-930/30",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      <div className={"flex flex-col gap-4"}>
        <div className={"flex justify-between gap-3"}>
          <div className={"flex gap-4 min-w-0"}>
            <div
              className={
                "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
              }
            >
              <Image
                src={image}
                alt={name}
                className={"rounded-[4px]"}
                priority={true}
              />
            </div>
            <div className={"min-w-0"}>
              <h3 className={"truncate"}>{name}</h3>
              <InlineLink
                href={url.href}
                target={"_blank"}
                className={"text-sm font-light min-w-0 max-w-full"}
                variant={"faded"}
              >
                <span className={"truncate"}>{url.title}</span>
                <ExternalLinkIcon size={12} className={"shrink-0"} />
              </InlineLink>
            </div>
          </div>
          {!hideSwitch && (
            <div className={"flex items-center shrink-0"}>
              <ToggleSwitch
                checked={switchState}
                onCheckedChange={onEnabledChange}
              />
            </div>
          )}
        </div>
        <div>
          <Paragraph className={"text-sm font-light"}>{description}</Paragraph>
        </div>
      </div>

      {data == undefined ? IntegrationButton : children}
    </div>
  );
}
