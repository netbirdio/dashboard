import { DatePickerWithRange } from "@components/DatePickerWithRange";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Calendar } from "@components/ui/Calendar";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ClockIcon } from "lucide-react";
import {
  clickOpen,
  Controlled,
  padded,
  Row,
  Stack,
  waitForOverlay,
} from "@/storybook/components";

const options = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days", disabled: true },
];

const iconOptions = options.map((o) => ({
  ...o,
  icon: () => <ClockIcon size={14} />,
}));

const range = {
  from: new Date("2026-09-24T00:00:00Z"),
  to: new Date("2026-10-08T23:59:59Z"),
};

const meta: Meta = {
  title: "Components/Select",
  decorators: [padded],
};
export default meta;

function RadixSelect({
  placeholder = false,
  disabled = false,
  open,
}: {
  placeholder?: boolean;
  disabled?: boolean;
  open?: boolean;
}) {
  return (
    <Select
      defaultValue={placeholder ? undefined : "14"}
      disabled={disabled}
      open={open}
    >
      <SelectTrigger className={"w-full"} data-testid={"select-trigger"}>
        <SelectValue placeholder={"Select expiration"} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const States: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <Stack>
      <Row label={"radix select"} className={"w-[320px]"}>
        <RadixSelect />
      </Row>
      <Row label={"placeholder"} className={"w-[320px]"}>
        <RadixSelect placeholder />
      </Row>
      <Row label={"disabled"} className={"w-[320px]"}>
        <RadixSelect disabled />
      </Row>
      <Row label={"select dropdown"} className={"w-[320px]"}>
        <Controlled initial={"7"}>
          {(v, set) => (
            <SelectDropdown value={v} onChange={set} options={options} />
          )}
        </Controlled>
      </Row>
      <Row label={"with icons"} className={"w-[320px]"}>
        <Controlled initial={"7"}>
          {(v, set) => (
            <SelectDropdown value={v} onChange={set} options={iconOptions} />
          )}
        </Controlled>
      </Row>
      <Row label={"placeholder"} className={"w-[320px]"}>
        <SelectDropdown
          value={""}
          onChange={() => {}}
          options={options}
          placeholder={"Select a period..."}
        />
      </Row>
      <Row label={"disabled"} className={"w-[320px]"}>
        <SelectDropdown
          value={"7"}
          onChange={() => {}}
          options={options}
          disabled
        />
      </Row>
      <Row label={"xs, secondary"} className={"w-[320px]"}>
        <SelectDropdown
          value={"7"}
          onChange={() => {}}
          options={options}
          size={"xs"}
          variant={"secondary"}
        />
      </Row>
    </Stack>
  ),
  play: ({ canvasElement }) => {
    canvasElement
      .querySelector("[data-testid=select-trigger]")
      ?.setAttribute("data-capture", "");
  },
};

/* Controlled open: Radix Select closes on window blur, which a capture
   running several browser windows triggers at random. */
export const RadixSelectOpen: StoryObj = {
  render: () => (
    <div className={"w-[320px]"}>
      <RadixSelect open />
    </div>
  ),
  play: async () => {
    await waitForOverlay("[role=listbox]");
  },
};

export const SelectDropdownOpen: StoryObj = {
  render: () => (
    <div className={"w-[320px]"}>
      <Controlled initial={"7"}>
        {(v, set) => (
          <SelectDropdown
            value={v}
            onChange={set}
            options={iconOptions}
            showSearch
          />
        )}
      </Controlled>
    </div>
  ),
  play: clickOpen("button"),
};

export const DateRange: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Stack>
      <Row label={"date range"}>
        <DatePickerWithRange value={range} onChange={() => {}} />
      </Row>
      <Row label={"disabled"}>
        <DatePickerWithRange value={range} onChange={() => {}} disabled />
      </Row>
    </Stack>
  ),
};

export const DateRangeOpen: StoryObj = {
  render: () => <DatePickerWithRange value={range} onChange={() => {}} />,
  play: clickOpen("button"),
};

export const CalendarRange: StoryObj = {
  render: () => (
    <Calendar
      mode={"range"}
      numberOfMonths={2}
      defaultMonth={new Date("2026-09-01T12:00:00Z")}
      selected={{
        from: new Date("2026-09-24T12:00:00Z"),
        to: new Date("2026-10-08T12:00:00Z"),
      }}
    />
  ),
};
