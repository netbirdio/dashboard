import { Callout } from "@components/Callout";
import CopyToClipboardText from "@components/CopyToClipboardText";
import ExternalLinkText from "@components/ExternalLinkText";
import HelpText from "@components/HelpText";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import Kbd from "@components/Kbd";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import SmallParagraph from "@components/SmallParagraph";
import { Mark } from "@components/ui/Mark";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, ExternalLinkIcon } from "lucide-react";
import { padded, Row, Stack } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Typography",
  decorators: [padded],
};
export default meta;

export const Text: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-6 max-w-[520px]"}>
      <div>
        <Label>Peer name</Label>
        <HelpText>Set an easily identifiable name for your peer.</HelpText>
      </div>
      <Paragraph>
        Paragraph text with an <InlineLink href={"#"}>inline link</InlineLink>{" "}
        in the middle of a sentence and a <Mark>netbird up</Mark> mark.
      </Paragraph>
      <SmallParagraph>Small paragraph for secondary details.</SmallParagraph>
      <Separator />
      <HelpText>
        Help text with <InlineLink href={"#"}>a link</InlineLink> and a longer
        second sentence that wraps to the next line to show the line height.
      </HelpText>
    </div>
  ),
};

export const Links: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Stack>
      {(["default", "faded", "white", "dashed"] as const).map((variant, i) => (
        <Row key={variant} label={variant}>
          <InlineLink
            href={"#"}
            variant={variant}
            data-capture={i === 0 ? "" : undefined}
          >
            {variant} link
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Row>
      ))}
      <Row label={"button link"}>
        <InlineButtonLink>Inline button link</InlineButtonLink>
      </Row>
      <Row label={"external link"}>
        <ExternalLinkText href={"https://docs.netbird.io"}>
          docs.netbird.io
        </ExternalLinkText>
      </Row>
      <Row label={"copy to clipboard"}>
        <CopyToClipboardText message={"Copied"}>
          100.92.14.3
        </CopyToClipboardText>
        <CopyToClipboardText
          message={"Copied"}
          alwaysShowIcon
          iconAlignment={"left"}
        >
          macbook-pro.netbird.cloud
        </CopyToClipboardText>
      </Row>
    </Stack>
  ),
};

export const FadedLinkHover: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <InlineLink href={"#"} variant={"faded"} data-capture={""}>
      faded link
    </InlineLink>
  ),
};

export const CopyHover: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <CopyToClipboardText message={"Copied"}>
      <span data-capture={""}>100.92.14.3</span>
    </CopyToClipboardText>
  ),
};

export const Keyboard: StoryObj = {
  render: () => (
    <Stack>
      {(["default", "darker", "netbird"] as const).map((variant) => (
        <Row key={variant} label={variant}>
          <Kbd variant={variant}>⌘</Kbd>
          <Kbd variant={variant}>K</Kbd>
          <Kbd variant={variant} size={"small"}>
            small
          </Kbd>
        </Row>
      ))}
      <Row label={"disabled"}>
        <Kbd disabled>Esc</Kbd>
      </Row>
    </Stack>
  ),
};

export const Callouts: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-4 w-[520px]"}>
      {(["default", "warning", "info", "success", "error"] as const).map(
        (variant) => (
          <Callout key={variant} variant={variant}>
            This is a <b>{variant}</b> callout with an{" "}
            <InlineLink href={"#"}>inline link</InlineLink>. It wraps over more
            than one line to show the line height.
          </Callout>
        ),
      )}
      <Callout
        variant={"warning"}
        icon={
          <AlertTriangle size={14} className={"shrink-0 relative top-[3px]"} />
        }
      >
        Warning callout with a custom icon.
      </Callout>
    </div>
  ),
};
