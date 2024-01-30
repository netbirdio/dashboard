import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { ToggleSwitch } from "@components/ToggleSwitch";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, Repeat } from "lucide-react";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import * as React from "react";

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
}: Props<T>) {
  return (
    <div
      className={cn(
        " border border-nb-gray-900/50 p-5 rounded-lg transition-all max-w-[360px] flex flex-col justify-between gap-4",
        switchState ? "bg-nb-gray-930/50" : "bg-nb-gray-930/30",
        disabled && "opacity-60 pointer-events-none",
      )}
    >
      <div className={"flex flex-col gap-4"}>
        <div className={"flex justify-between"}>
          <div className={"flex gap-4"}>
            <div
              className={
                "h-12 w-12 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
              }
            >
              <Image src={image} alt={name} className={"rounded-[4px]"} />
            </div>
            <div>
              <h3 className={""}>{name}</h3>
              <InlineLink
                href={url.href}
                target={"_blank"}
                className={"text-sm font-light"}
                variant={"faded"}
              >
                {url.title}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </div>
          </div>
          {!hideSwitch && (
            <div className={"flex items-center"}>
              <ToggleSwitch
                checked={switchState}
                onCheckedChange={onEnabledChange}
                className={"grow"}
              />
            </div>
          )}
        </div>
        <div>
          <Paragraph className={"text-sm font-light"}>{description}</Paragraph>
        </div>
      </div>

      {data == undefined ? (
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
      ) : (
        children
      )}
    </div>
  );
}
