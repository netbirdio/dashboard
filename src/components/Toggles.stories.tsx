import { Checkbox } from "@components/Checkbox";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { Input } from "@components/Input";
import { Radio, RadioItem } from "@components/Radio";
import { RadioCard, RadioCardGroup } from "@components/RadioCard";
import { RadioGroup, RadioGroupItem } from "@components/RadioGroup";
import { Slider } from "@components/Slider";
import { ToggleSwitch } from "@components/ToggleSwitch";
import PolicyDirection from "@components/ui/PolicyDirection";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  FolderGit2,
  MonitorSmartphoneIcon,
  NetworkIcon,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import { Controlled, padded, Row, Stack } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Toggles",
  decorators: [padded],
};
export default meta;

export const Checkboxes: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Stack>
      <Row label={"default"}>
        <Checkbox data-capture={""} />
        <Checkbox checked={true} />
        <Checkbox checked={"indeterminate"} />
        <Checkbox disabled />
        <Checkbox disabled checked={true} />
      </Row>
      <Row label={"tableCell"}>
        <Checkbox variant={"tableCell"} />
        <Checkbox variant={"tableCell"} checked={true} />
        <Checkbox variant={"tableCell"} checked={"indeterminate"} />
      </Row>
    </Stack>
  ),
};

export const Switches: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Stack>
      <Row label={"default"}>
        <ToggleSwitch data-capture={""} />
        <ToggleSwitch checked={true} />
        <ToggleSwitch disabled />
        <ToggleSwitch disabled checked={true} />
      </Row>
      <Row label={"small"}>
        <ToggleSwitch size={"small"} />
        <ToggleSwitch size={"small"} checked={true} />
        <ToggleSwitch size={"small"} disabled checked={true} />
      </Row>
      <Row label={"red-green / red"}>
        <ToggleSwitch variant={"red-green"} />
        <ToggleSwitch variant={"red-green"} checked={true} />
        <ToggleSwitch variant={"red"} />
        <ToggleSwitch variant={"red"} checked={true} />
      </Row>
    </Stack>
  ),
};

export const FancySwitch: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"flex flex-col gap-4 w-[560px]"}>
      <FancyToggleSwitch
        value={true}
        onChange={() => {}}
        label={
          <>
            <ShieldCheck size={15} />
            Enable Peer Approval
          </>
        }
        helpText={"Require peers to be approved by an administrator."}
        data-testid={"fancy-on"}
      >
        <Input defaultValue={"Nested content shown when on"} />
      </FancyToggleSwitch>
      <FancyToggleSwitch
        value={false}
        onChange={() => {}}
        label={"Lazy connections"}
        helpText={"Only connect to peers when traffic flows."}
      />
      <FancyToggleSwitch
        value={false}
        disabled
        onChange={() => {}}
        label={"Disabled setting"}
        helpText={"Not available on this plan."}
      />
      <FancyToggleSwitch
        value={true}
        disabled
        onChange={() => {}}
        label={"Disabled, on"}
        helpText={"Managed by your organisation."}
      />
    </div>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=fancy-on]")
      ?.setAttribute("data-capture", "");
  },
};

export const Radios: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Stack>
      <Row label={"allow / block"}>
        <Controlled initial={"allow"}>
          {(v, set) => (
            <RadioGroup value={v} onChange={set}>
              <RadioGroupItem value={"allow"} variant={"green"}>
                <ShieldCheck size={16} />
                Allow
              </RadioGroupItem>
              <RadioGroupItem value={"deny"} variant={"red"}>
                <ShieldXIcon size={16} />
                Block
              </RadioGroupItem>
            </RadioGroup>
          )}
        </Controlled>
      </Row>
      <Row label={"block selected"}>
        <RadioGroup value={"deny"} onChange={() => {}}>
          <RadioGroupItem value={"allow"} variant={"green"}>
            <ShieldCheck size={16} />
            Allow
          </RadioGroupItem>
          <RadioGroupItem value={"deny"} variant={"red"}>
            <ShieldXIcon size={16} />
            Block
          </RadioGroupItem>
        </RadioGroup>
      </Row>
      <Row label={"default"}>
        <RadioGroup value={"b"} onChange={() => {}}>
          <RadioGroupItem value={"a"}>First</RadioGroupItem>
          <RadioGroupItem value={"b"}>Second</RadioGroupItem>
          <RadioGroupItem value={"c"}>Third</RadioGroupItem>
        </RadioGroup>
      </Row>
      <Row label={"radio items"}>
        <Radio defaultValue={"one"} name={"story-radio"}>
          <div className={"flex items-center gap-4"}>
            <RadioItem value={"one"} />
            <RadioItem value={"two"} data-capture={""} />
          </div>
        </Radio>
      </Row>
    </Stack>
  ),
};

export const RadioCards: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"w-[460px]"}>
      <RadioCardGroup value={"peer"} onValueChange={() => {}}>
        <RadioCard
          value={"peer"}
          icon={<MonitorSmartphoneIcon size={14} />}
          title={"Routing Peer"}
          description={"Route traffic through a single peer."}
        />
        <RadioCard
          value={"group"}
          icon={<FolderGit2 size={14} />}
          title={"Peer Group"}
          description={
            "Route through all peers of a group for high availability."
          }
          data-capture={""}
        />
        <RadioCard
          value={"disabled"}
          disabled
          icon={<NetworkIcon size={14} />}
          title={"Disabled option"}
          description={"Not available."}
        />
      </RadioCardGroup>
    </div>
  ),
};

export const SliderAndDirection: StoryObj = {
  tags: ["capture-focus"],
  render: () => (
    <Stack>
      <Row label={"slider"} className={"w-[360px]"}>
        <Slider defaultValue={[40]} max={100} step={1} />
      </Row>
      <Row label={"policy direction"}>
        <PolicyDirection value={"bi"} onChange={() => {}} />
        <PolicyDirection value={"in"} onChange={() => {}} />
        <PolicyDirection value={"bi"} onChange={() => {}} disabled />
      </Row>
    </Stack>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[role=slider]")
      ?.setAttribute("data-capture", "");
  },
};
