import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Loader2, MoreVertical, PlusCircle, Trash2 } from "lucide-react";
import { padded, Row, Stack } from "@/storybook/components";

const variants = [
  "default",
  "primary",
  "secondary",
  "secondaryLighter",
  "input",
  "dropdown",
  "dotted",
  "tertiary",
  "white",
  "outline",
  "default-outline",
  "danger-outline",
  "danger-text",
  "danger",
] as const;
const sizes = ["xs", "xs2", "sm", "md", "lg"] as const;

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  decorators: [padded],
};
export default meta;

/* The `capture-hover` / `capture-focus` tags make scripts/capture.mjs take
   extra real-pointer and keyboard-focus shots of the [data-capture] element. */
export const Variants: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"flex flex-col gap-3"}>
      {variants.map((variant, i) => (
        <div key={variant} className={"flex items-center gap-3"}>
          <span className={"w-36 text-xs font-mono text-nb-gray-400"}>
            {variant}
          </span>
          <Button
            variant={variant as never}
            data-capture={i === 1 ? "" : undefined}
          >
            <PlusCircle size={16} /> Add Peer
          </Button>
          <Button variant={variant as never}>Text only</Button>
          <Button variant={variant as never} disabled>
            <PlusCircle size={16} /> Disabled
          </Button>
          <Button variant={variant as never} size={"xs"} className={"!px-3"}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Sizes: StoryObj = {
  render: () => (
    <Stack>
      {(["primary", "secondary", "default-outline"] as const).map((variant) => (
        <Row key={variant} label={variant}>
          {sizes.map((size) => (
            <Button key={size} variant={variant} size={size}>
              <PlusCircle size={14} />
              Size {size}
            </Button>
          ))}
        </Row>
      ))}
    </Stack>
  ),
};

export const Shapes: StoryObj = {
  render: () => (
    <Stack>
      <Row label={"icon only"}>
        <Button variant={"default-outline"} size={"xs"} className={"!px-3"}>
          <MoreVertical size={16} />
        </Button>
        <Button variant={"secondary"} size={"xs"} className={"!px-3"}>
          <Trash2 size={14} />
        </Button>
      </Row>
      <Row label={"square, no border"}>
        <Button variant={"secondary"} rounded={false} border={0} size={"sm"}>
          No border, square
        </Button>
        <Button variant={"primary"} rounded={false} size={"sm"}>
          Square
        </Button>
      </Row>
      <Row label={"loading"}>
        <Button variant={"primary"} disabled>
          <Loader2 size={16} className={"animate-spin"} />
          Saving...
        </Button>
        <Button variant={"secondary"} disabled>
          <Loader2 size={16} className={"animate-spin"} />
          Loading
        </Button>
      </Row>
      <Row label={"full width"} className={"w-[420px]"}>
        <Button variant={"primary"} className={"w-full"}>
          Continue
        </Button>
      </Row>
    </Stack>
  ),
};

const one = (variant: (typeof variants)[number]) => (
  <Button variant={variant as never} data-capture={""}>
    <PlusCircle size={16} />
    {variant}
  </Button>
);

/* One story per variant so hover and focus are captured for each of them.
   Tags stay literal because Storybook reads them statically. */
export const Default: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("default"),
};
export const Primary: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("primary"),
};
export const Secondary: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("secondary"),
};
export const SecondaryLighter: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("secondaryLighter"),
};
export const Input: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("input"),
};
export const Dropdown: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("dropdown"),
};
export const Dotted: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("dotted"),
};
export const Tertiary: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("tertiary"),
};
export const White: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("white"),
};
export const Outline: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("outline"),
};
export const DefaultOutline: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("default-outline"),
};
export const DangerOutline: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("danger-outline"),
};
export const DangerText: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("danger-text"),
};
export const Danger: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => one("danger"),
};

export const Group: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Stack>
      <Row label={"default"}>
        <ButtonGroup>
          <ButtonGroup.Button variant={"tertiary"}>Allow</ButtonGroup.Button>
          <ButtonGroup.Button variant={"secondary"} data-capture={""}>
            Block
          </ButtonGroup.Button>
          <ButtonGroup.Button variant={"secondary"}>Audit</ButtonGroup.Button>
        </ButtonGroup>
      </Row>
      <Row label={"disabled"}>
        <ButtonGroup disabled>
          <ButtonGroup.Button variant={"tertiary"} disabled>
            Allow
          </ButtonGroup.Button>
          <ButtonGroup.Button variant={"secondary"} disabled>
            Block
          </ButtonGroup.Button>
        </ButtonGroup>
      </Row>
    </Stack>
  ),
};
