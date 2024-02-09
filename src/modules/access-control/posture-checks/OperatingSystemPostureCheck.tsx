import { Input } from "@components/Input";
import { RadioGroup, RadioGroupItem } from "@components/RadioGroup";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import {
  ChevronRightCircle,
  GalleryHorizontalEnd,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";

type Props = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  defaultValue?: string;
  versionList?: SelectOption[];
  children?: React.ReactNode;
};

const allOrMinOptions = [
  {
    label: "All versions",
    value: "all",
    icon: GalleryHorizontalEnd,
  },
  {
    label: "Greater than",
    value: "min",
    icon: ChevronRightCircle,
  },
] as SelectOption[];

export const OperatingSystemPostureCheck = ({
  value,
  onChange,
  versionList,
  defaultValue,
  children,
}: Props) => {
  const [allow, setAllow] = useState(value == undefined ? "block" : "allow");
  const [allOrMin, setAllOrMin] = useState(value == "0" ? "all" : "min");

  const changeAllow = (value: string) => {
    setAllow(value);
    if (value === "block") {
      setAllOrMin("all");
      onChange(undefined);
    } else {
      onChange("0");
    }
  };

  const changeDropdown = (value: string) => {
    setAllOrMin(value);
    if (value === "all") {
      onChange("0");
    }
  };

  return (
    <div className={""}>
      <div className={" gap-4 items-center flex"}>
        <div className={"min-w-[100px]"}>{children}</div>
        <div className={"grid grid-cols-3 gap-4"}>
          <RadioGroup value={allow} onChange={changeAllow}>
            <RadioGroupItem value={"allow"} variant={"green"}>
              <ShieldCheck size={14} />
              Allow
            </RadioGroupItem>
            <RadioGroupItem value={"block"} variant={"red"}>
              <ShieldXIcon size={14} />
              Block
            </RadioGroupItem>
          </RadioGroup>
          <SelectDropdown
            value={allOrMin}
            onChange={setAllOrMin}
            options={allOrMinOptions}
            disabled={allow === "block"}
          />
          {versionList ? (
            <SelectDropdown
              value={value || "0"}
              showSearch={true}
              placeholder={"Search version..."}
              onChange={onChange}
              options={versionList}
              disabled={allOrMin === "all" || allow === "block"}
            />
          ) : (
            <Input
              value={value}
              placeholder={"e.g., 10.15.7"}
              disabled={allOrMin === "all" || allow === "block"}
              onChange={(v) => {
                onChange(v.target.value);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
