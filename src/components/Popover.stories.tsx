import Button from "@components/Button";
import FullTooltip from "@components/FullTooltip";
import HelpText from "@components/HelpText";
import { HelpTooltip } from "@components/HelpTooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@components/HoverCard";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Popover, PopoverContent, PopoverTrigger } from "@components/Popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@components/Tooltip";
import DescriptionWithTooltip from "@components/ui/DescriptionWithTooltip";
import { DomainListBadge } from "@components/ui/DomainListBadge";
import MultipleDomains from "@components/ui/MultipleDomains";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import TruncatedText from "@components/ui/TruncatedText";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { clickOpen, hoverOpen, padded } from "@/storybook/components";

const domains = [
  "example.com",
  "intra.example.com",
  "vpn.example.com",
  "wiki.example.com",
];

const meta: Meta = {
  title: "Components/Popover",
  decorators: [padded],
};
export default meta;

function PopoverDemo({ variant }: { variant: "lighter" | "dark" }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={"secondary"} size={"sm"}>
          {variant} popover
        </Button>
      </PopoverTrigger>
      <PopoverContent variant={variant} className={"w-72"} align={"start"}>
        <Label>Popover title</Label>
        <HelpText>Popover help text for the {variant} variant.</HelpText>
        <Input placeholder={"Inside a popover"} />
      </PopoverContent>
    </Popover>
  );
}

export const PopoverLighterOpen: StoryObj = {
  render: () => <PopoverDemo variant={"lighter"} />,
  play: clickOpen("button"),
};

export const PopoverDarkOpen: StoryObj = {
  render: () => <PopoverDemo variant={"dark"} />,
  play: clickOpen("button"),
};

function TooltipDemo({ variant }: { variant: "default" | "lighter" }) {
  return (
    <div className={"pt-16"}>
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant={"secondary"} size={"sm"}>
            {variant} tooltip
          </Button>
        </TooltipTrigger>
        <TooltipContent variant={variant}>
          <div className={"text-xs px-1"}>
            Tooltip content for the {variant} variant
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/* Controlled open so the shot never depends on pointer timing. */
export const TooltipDefault: StoryObj = {
  render: () => <TooltipDemo variant={"default"} />,
};
export const TooltipLighter: StoryObj = {
  render: () => <TooltipDemo variant={"lighter"} />,
};

export const FullTooltipOpen: StoryObj = {
  render: () => (
    <div className={"pt-16"}>
      <FullTooltip
        content={
          <div className={"text-xs max-w-xs"}>
            Full tooltip with <b>rich</b> content that wraps onto a second line.
          </div>
        }
      >
        <span
          className={"text-sm text-nb-gray-300"}
          data-testid={"full-tooltip"}
        >
          Hover for full tooltip
        </span>
      </FullTooltip>
    </div>
  ),
  play: hoverOpen("[data-testid=full-tooltip]"),
};

export const HelpTooltipOpen: StoryObj = {
  render: () => (
    <div className={"pt-16 flex items-center gap-2 text-sm"}>
      <span>Setting label</span>
      <span data-testid={"help"}>
        <HelpTooltip content={"Explains what this setting does."} />
      </span>
    </div>
  ),
  play: hoverOpen("[data-testid=help] > *"),
};

export const HoverCardOpen: StoryObj = {
  render: () => (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild>
        <span className={"text-sm underline"} data-testid={"hovercard"}>
          Hover card trigger
        </span>
      </HoverCardTrigger>
      <HoverCardContent>
        <div className={"text-xs"}>Hover card content with some detail.</div>
      </HoverCardContent>
    </HoverCard>
  ),
  play: hoverOpen("[data-testid=hovercard]"),
};

export const TruncatedTextOpen: StoryObj = {
  render: () => (
    <div className={"pt-16"} data-testid={"truncated"}>
      <TruncatedText
        text={
          "a-very-long-peer-name-that-will-certainly-be-truncated.netbird.cloud"
        }
        maxChars={30}
      />
    </div>
  ),
  play: hoverOpen("[data-testid=truncated] > *"),
};

export const TextWithTooltipOpen: StoryObj = {
  render: () => (
    <div className={"pt-16 flex flex-col gap-4"}>
      <span data-testid={"text-tooltip"}>
        <TextWithTooltip
          text={"Description long enough to exceed the maximum characters"}
          maxChars={20}
        />
      </span>
      <DescriptionWithTooltip
        text={
          "Allows the developers group to reach the staging servers on port 443"
        }
        maxChars={30}
      />
    </div>
  ),
  play: hoverOpen("[data-testid=text-tooltip] > *"),
};

export const DomainListOpen: StoryObj = {
  render: () => (
    <span data-testid={"domains"} className={"inline-flex"}>
      <DomainListBadge domains={domains} />
    </span>
  ),
  play: hoverOpen("[data-testid=domains] > *"),
};

export const MultipleDomainsOpen: StoryObj = {
  render: () => (
    <span data-testid={"domains"} className={"inline-flex"}>
      <MultipleDomains domains={domains} />
    </span>
  ),
  play: hoverOpen("[data-testid=domains] > *"),
};
