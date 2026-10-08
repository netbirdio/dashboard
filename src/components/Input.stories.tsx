import { DropdownInput } from "@components/DropdownInput";
import { Input } from "@components/Input";
import PinCodeInput from "@components/PinCodeInput";
import { Textarea } from "@components/Textarea";
import InputDomain from "@components/ui/InputDomain";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchIcon } from "lucide-react";
import { Controlled, padded, Row, Stack } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Input",
  decorators: [padded],
};
export default meta;

const w = "w-[360px]";

export const States: StoryObj = {
  render: () => (
    <Stack>
      <Row label={"placeholder"} className={w}>
        <Input placeholder={"e.g. Developers"} />
      </Row>
      <Row label={"value"} className={w}>
        <Input defaultValue={"macbook-pro-olivia"} />
      </Row>
      <Row label={"prefix"} className={w}>
        <Input customPrefix={"https://"} defaultValue={"app.netbird.io"} />
      </Row>
      <Row label={"suffix"} className={w}>
        <Input customSuffix={"Days"} defaultValue={"14"} type={"number"} />
      </Row>
      <Row label={"icon"} className={w}>
        <Input icon={<SearchIcon size={14} />} placeholder={"Search..."} />
      </Row>
      <Row label={"error"} className={w}>
        <Input
          customPrefix={"https://"}
          defaultValue={"not a domain"}
          error={"Please enter a valid domain"}
        />
      </Row>
      <Row label={"error tooltip"} className={w}>
        <Input
          defaultValue={"300.1.1.1"}
          error={"Invalid IP address"}
          errorTooltip
        />
      </Row>
      <Row label={"disabled"} className={w}>
        <Input disabled defaultValue={"Disabled value"} customPrefix={"IP"} />
      </Row>
      <Row label={"read-only"} className={w}>
        <Input readOnly defaultValue={"Read-only value"} />
      </Row>
      <Row label={"darker"} className={w}>
        <Input variant={"darker"} placeholder={"Darker variant"} />
      </Row>
      <Row label={"password"} className={w}>
        <Input
          type={"password"}
          showPasswordToggle
          defaultValue={"secret-value"}
        />
      </Row>
    </Stack>
  ),
};

export const Hover: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={w}>
      <Input placeholder={"e.g. Developers"} data-capture={""} />
    </div>
  ),
};

export const FocusWithValue: StoryObj = {
  tags: ["capture-focus"],
  render: () => (
    <div className={w}>
      <Input
        customPrefix={"https://"}
        defaultValue={"app.netbird.io"}
        data-capture={""}
      />
    </div>
  ),
};

export const FocusError: StoryObj = {
  tags: ["capture-focus"],
  render: () => (
    <div className={w}>
      <Input
        defaultValue={"not a domain"}
        error={"Please enter a valid domain"}
        data-capture={""}
      />
    </div>
  ),
};

export const TextareaStates: StoryObj = {
  tags: ["capture-focus"],
  render: () => (
    <Stack>
      <Row label={"placeholder"} className={w}>
        <Textarea
          placeholder={"Describe the policy"}
          rows={3}
          data-capture={""}
        />
      </Row>
      <Row label={"value"} className={w}>
        <Textarea
          defaultValue={"Allows developers to reach the staging servers."}
          rows={3}
        />
      </Row>
      <Row label={"error"} className={w}>
        <Textarea
          defaultValue={"{ invalid json"}
          error={"Invalid JSON"}
          rows={3}
        />
      </Row>
      <Row label={"disabled"} className={w}>
        <Textarea disabled defaultValue={"Disabled"} rows={2} />
      </Row>
    </Stack>
  ),
};

export const Specialised: StoryObj = {
  render: () => (
    <Stack>
      <Row label={"dropdown input"} className={w}>
        <Controlled initial={"intra.example.com"}>
          {(v, set) => (
            <DropdownInput
              value={v}
              onChange={(e: unknown) => set(typeof e === "string" ? e : "")}
              placeholder={"Add domain"}
            />
          )}
        </Controlled>
      </Row>
      <Row label={"domain"} className={"w-[420px]"}>
        <InputDomain
          value={{ name: "intra.example.com", id: "1" }}
          onChange={() => {}}
          onRemove={() => {}}
        />
      </Row>
      <Row label={"domain error"} className={"w-[420px]"}>
        <InputDomain
          value={{ name: "not_valid..", id: "2" }}
          onChange={() => {}}
          onRemove={() => {}}
        />
      </Row>
      <Row label={"domain disabled"} className={"w-[420px]"}>
        <InputDomain
          value={{ name: "vpn.example.com", id: "3" }}
          onChange={() => {}}
          onRemove={() => {}}
          disabled
        />
      </Row>
      <Row label={"pin code"}>
        <Controlled initial={"123"}>
          {(v, set) => <PinCodeInput value={v} onChange={set} />}
        </Controlled>
      </Row>
      <Row label={"pin code disabled"}>
        <PinCodeInput value={"123456"} onChange={() => {}} disabled />
      </Row>
    </Stack>
  ),
};

export const PinCodeFocus: StoryObj = {
  tags: ["capture-focus"],
  render: () => (
    <Controlled initial={"12"}>
      {(v, set) => <PinCodeInput value={v} onChange={set} />}
    </Controlled>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelectorAll("input")[2]
      ?.setAttribute("data-capture", "");
  },
};
