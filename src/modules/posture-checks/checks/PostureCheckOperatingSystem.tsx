import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { RadioGroup, RadioGroupItem } from "@components/RadioGroup";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { IconMathEqualGreater } from "@tabler/icons-react";
import { validator } from "@utils/helpers";
import { isEmpty } from "lodash";
import {
  Disc3Icon,
  ExternalLinkIcon,
  FileCog,
  GalleryHorizontalEnd,
  ShieldCheck,
  ShieldXIcon,
} from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import AndroidIcon from "@/assets/icons/AndroidIcon";
import AppleIcon from "@/assets/icons/AppleIcon";
import IOSIcon from "@/assets/icons/IOSIcon";
import { LinuxIcon } from "@/assets/icons/LinuxIcon";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import {
  androidVersions,
  iOSVersions,
  macOSVersions,
  OperatingSystemVersionCheck,
  windowsKernelVersions,
} from "@/interfaces/PostureCheck";
import { PostureCheckCard } from "@/modules/posture-checks/ui/PostureCheckCard";

type Props = {
  value?: OperatingSystemVersionCheck;
  onChange: (value: OperatingSystemVersionCheck | undefined) => void;
  disabled?: boolean;
};

export const PostureCheckOperatingSystem = ({
  value,
  onChange,
  disabled,
}: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <PostureCheckCard
      open={open}
      setOpen={setOpen}
      key={open ? 1 : 0}
      icon={<Disc3Icon size={16} />}
      title={"Operating System"}
      modalWidthClass={"max-w-xl"}
      description={
        "Restrict access in your network based on the operating system."
      }
      iconClass={"bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300"}
      active={value !== undefined}
      onReset={() => onChange(undefined)}
    >
      <CheckContent
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
        disabled={disabled}
      />
    </PostureCheckCard>
  );
};

const CheckContent = ({ value, onChange, disabled }: Props) => {
  const [tab] = useState(String(OperatingSystem.LINUX));

  const firstTimeCheck = value === undefined;

  const [windowsVersion, setWindowsVersion] = useState<string>(
    firstTimeCheck
      ? ""
      : value && value.windows
      ? value.windows.min_kernel_version
      : "-",
  );
  const [macOSVersion, setMacOSVersion] = useState<string>(
    firstTimeCheck
      ? ""
      : value && value.darwin
      ? value.darwin?.min_version
      : "-",
  );
  const [androidVersion, setAndroidVersion] = useState<string>(
    firstTimeCheck
      ? ""
      : value && value.android
      ? value.android?.min_version
      : "-",
  );
  const [iOSVersion, setIOSVersion] = useState<string>(
    firstTimeCheck ? "" : value && value.ios ? value.ios?.min_version : "-",
  );
  const [linuxVersion, setLinuxVersion] = useState<string>(
    firstTimeCheck
      ? ""
      : value && value.linux
      ? value.linux?.min_kernel_version
      : "-",
  );

  const [linuxError, setLinuxError] = useState("");
  const [windowsError, setWindowsError] = useState("");
  const [macOSError, setMacOSError] = useState("");
  const [iOSError, setIOSError] = useState("");
  const [androidError, setAndroidError] = useState("");

  const versionError =
    linuxError ||
    windowsError ||
    macOSError ||
    iOSError ||
    androidError ||
    disabled;

  return (
    <>
      <Tabs defaultValue={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={String(OperatingSystem.LINUX)}>
            <LinuxIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Linux
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.WINDOWS)}>
            <WindowsIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Windows
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.APPLE)}>
            <AppleIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            macOS
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.IOS)}>
            <IOSIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            iOS
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.ANDROID)}>
            <AndroidIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Android
          </TabsTrigger>
        </TabsList>
        <TabsContent value={String(OperatingSystem.LINUX)} className={"px-8"}>
          <OperatingSystemTab
            value={linuxVersion}
            onChange={setLinuxVersion}
            os={OperatingSystem.LINUX}
            onError={setLinuxError}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.WINDOWS)} className={"px-8"}>
          <OperatingSystemTab
            versionList={windowsKernelVersions}
            value={windowsVersion}
            onChange={setWindowsVersion}
            os={OperatingSystem.WINDOWS}
            onError={setWindowsError}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.APPLE)} className={"px-8"}>
          <OperatingSystemTab
            versionList={macOSVersions}
            value={macOSVersion}
            onChange={setMacOSVersion}
            os={OperatingSystem.APPLE}
            onError={setMacOSError}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.IOS)} className={"px-8"}>
          <OperatingSystemTab
            versionList={iOSVersions}
            value={iOSVersion}
            onChange={setIOSVersion}
            os={OperatingSystem.IOS}
            onError={setIOSError}
            disabled={disabled}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.ANDROID)} className={"px-8"}>
          <OperatingSystemTab
            versionList={androidVersions}
            value={androidVersion}
            onChange={setAndroidVersion}
            os={OperatingSystem.ANDROID}
            onError={setAndroidError}
            disabled={disabled}
          />
        </TabsContent>
      </Tabs>
      <div className={"h-6"}></div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/manage-posture-checks#operating-system-version-check"
              }
              target={"_blank"}
            >
              Operating System Check
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            disabled={!!versionError}
            variant={"primary"}
            onClick={() => {
              const osCheck = {} as OperatingSystemVersionCheck;

              if (windowsVersion !== "-") {
                osCheck.windows = { min_kernel_version: windowsVersion };
              }
              if (macOSVersion !== "-") {
                osCheck.darwin = { min_version: macOSVersion };
              }
              if (androidVersion !== "-") {
                osCheck.android = { min_version: androidVersion };
              }
              if (iOSVersion !== "-") {
                osCheck.ios = { min_version: iOSVersion };
              }
              if (linuxVersion !== "-") {
                osCheck.linux = { min_kernel_version: linuxVersion };
              }

              if (isEmpty(osCheck)) {
                onChange(undefined);
              } else {
                onChange(osCheck);
              }
            }}
          >
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
};

type OperatingSystemTabProps = {
  value: string;
  onChange: (value: string) => void;
  versionList?: SelectOption[];
  os: OperatingSystem;
  onError: (error: string) => void;
  disabled?: boolean;
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

export const OperatingSystemTab = ({
  value,
  onChange,
  versionList,
  os,
  onError,
  disabled,
}: OperatingSystemTabProps) => {
  const [allow, setAllow] = useState(value == "-" ? "block" : "allow");
  const [allOrMin, setAllOrMin] = useState(
    value == "" || value == "-" || value == "0" ? "all" : "min",
  );
  const [useCustomVersion, setUseCustomVersion] = useState(() => {
    if (!versionList) return false;
    if (!value) return false;
    if (value === "-") return false;
    if (value === "0") return false;
    const find = versionList.map((v) => v.value).includes(value);
    return !find;
  });

  const changeAllow = (value: string) => {
    setAllow(value);
    if (value === "block") {
      setAllOrMin("all");
      onChange("-");
      setAllOrMin("all");
      setUseCustomVersion(false);
    } else {
      onChange("");
      setAllOrMin("all");
      setUseCustomVersion(false);
    }
  };

  const changeAllOrMin = (option: string) => {
    setAllOrMin(option);
    if (option === "all") {
      onChange("");
    } else if (option === "min" && value == "" && versionList) {
      const getLast = versionList[versionList.length - 1];
      onChange(getLast.value);
    }
  };

  const prefix =
    os === OperatingSystem.LINUX || os === OperatingSystem.WINDOWS
      ? "Kernel Version"
      : "Version";

  const versionError = useMemo(() => {
    const msg = "Please enter a valid version, e.g., 0.2, 0.2.0, 0.2.0-alpha.1";
    if (value == "") return "";
    if (value == "-") return "";
    const validSemver = validator.isValidVersion(value);
    if (!validSemver) return msg;
    return "";
  }, [value]);

  useEffect(() => {
    onError(versionError);
  }, [versionError, onError]);

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
          onChange={changeAllOrMin}
          options={allOrMinOptions}
          disabled={allow === "block" || disabled}
        />
        {versionList && !useCustomVersion ? (
          <SelectDropdown
            value={value || "0"}
            showSearch={true}
            placeholder={"Select version..."}
            onChange={onChange}
            options={versionList}
            disabled={allOrMin === "all" || allow === "block" || disabled}
          />
        ) : (
          <Input
            value={value}
            customPrefix={prefix}
            placeholder={"e.g., 6.0.0"}
            error={versionError}
            errorTooltip={true}
            disabled={allOrMin === "all" || allow === "block" || disabled}
            onChange={(v) => {
              onChange(v.target.value);
            }}
          />
        )}
      </div>
      {os !== OperatingSystem.LINUX && (
        <div className={"mt-4"}>
          <FancyToggleSwitch
            disabled={allow === "block" || allOrMin === "all" || disabled}
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
