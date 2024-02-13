import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { RadioGroup, RadioGroupItem } from "@components/RadioGroup";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { IconMathEqualGreater } from "@tabler/icons-react";
import {
  FileCog,
  GalleryHorizontalEnd,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

type Props = {
  value: string;
  onChange: (value: string) => void;
  versionList?: SelectOption[];
  os: OperatingSystem;
};

const allOrMinOptions = [
  {
    label: "All versions",
    value: "all",
    icon: GalleryHorizontalEnd,
  },
  {
    label: "Equal or greater than",
    value: "min",
    icon: IconMathEqualGreater,
  },
] as SelectOption[];

export const OperatingSystemPostureCheck = ({
  value,
  onChange,
  versionList,
  os,
}: Props) => {
  const [allow, setAllow] = useState(value == "-" ? "block" : "allow");
  const [allOrMin, setAllOrMin] = useState(value == "" ? "all" : "min");
  const [useCustomVersion, setUseCustomVersion] = useState(false);

  const changeAllow = (value: string) => {
    setAllow(value);
    if (value === "block") {
      setAllOrMin("all");
      onChange("-");
      setAllOrMin("all");
      setUseCustomVersion(false);
    } else {
      onChange("");
    }
  };

  const prefix =
    os === OperatingSystem.LINUX || os === OperatingSystem.WINDOWS
      ? "Kernel Version"
      : "Version";

  return (
    <div className={""}>
      <div className={"flex justify-between items-start gap-10 "}>
        <div>
          <Label>Allow or Block</Label>
          <HelpText>
            Choose whether you want to allow or block the operating system.
          </HelpText>
        </div>
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
      </div>
      <div className={"gap-4 items-center grid grid-cols-2 mt-3"}>
        <SelectDropdown
          value={allOrMin}
          onChange={setAllOrMin}
          options={allOrMinOptions}
          disabled={allow === "block"}
        />
        {versionList && !useCustomVersion ? (
          <SelectDropdown
            value={value || "0"}
            showSearch={true}
            placeholder={"Select version..."}
            onChange={onChange}
            options={versionList}
            disabled={allOrMin === "all" || allow === "block"}
          />
        ) : (
          <Input
            value={value}
            customPrefix={prefix}
            placeholder={"e.g., 6.0.0"}
            disabled={allOrMin === "all" || allow === "block"}
            onChange={(v) => {
              onChange(v.target.value);
            }}
          />
        )}
      </div>
      {os !== OperatingSystem.LINUX && (
        <div className={"mt-4"}>
          <FancyToggleSwitch
            disabled={allow === "block" || allOrMin === "all"}
            value={useCustomVersion}
            onChange={setUseCustomVersion}
            label={
              <>
                <FileCog size={14} />
                Use custom version number
              </>
            }
            helpText={"Use a custom version number if you need more control."}
          />
        </div>
      )}
    </div>
  );
};
