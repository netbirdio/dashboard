import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { LockKeyhole, LockOpen, ShieldX } from "lucide-react";
import {
  TargetAccessAction,
  type TargetAccessAction as TargetAccessActionValue,
} from "@/interfaces/ReverseProxy";

type Props = {
  value?: string;
  onChange: (value: TargetAccessActionValue) => void;
  supportsTargetAccessControl: boolean;
  privateService: boolean;
};

const isKnownAction = (value: string): value is TargetAccessActionValue =>
  Object.values(TargetAccessAction).some((action) => action === value);

export default function ReverseProxyTargetAccessControl({
  value,
  onChange,
  supportsTargetAccessControl,
  privateService,
}: Readonly<Props>) {
  const selectedValue = value ?? TargetAccessAction.INHERIT;
  const hasUnsupportedValue = !isKnownAction(selectedValue);

  const options: SelectOption[] = [
    {
      label: "Use service authentication",
      value: TargetAccessAction.INHERIT,
      icon: LockKeyhole,
    },
    {
      label: "Bypass authentication",
      value: TargetAccessAction.BYPASS,
      icon: LockOpen,
      disabled: !supportsTargetAccessControl || privateService,
    },
    {
      label: "Block access",
      value: TargetAccessAction.BLOCK,
      icon: ShieldX,
      disabled: !supportsTargetAccessControl,
    },
  ];

  if (hasUnsupportedValue) {
    options.push({
      label: `Unsupported setting (${selectedValue})`,
      value: selectedValue,
      disabled: true,
    });
  }

  return (
    <div
      className={"flex items-center justify-between gap-6"}
      data-testid={"target-access-control-setting"}
    >
      <div>
        <Label>Access</Label>
        <HelpText className={"mb-0 max-w-sm"}>
          Use the service authentication settings, make this location public, or
          deny requests before they reach the target.
        </HelpText>
        {!supportsTargetAccessControl && (
          <div data-testid={"target-access-control-unsupported-cluster"}>
            <HelpText className={"mb-0 mt-1 !text-yellow-400"}>
              This proxy cluster does not support per-target access controls.
            </HelpText>
          </div>
        )}
        {supportsTargetAccessControl && privateService && (
          <div data-testid={"target-access-control-private-service"}>
            <HelpText className={"mb-0 mt-1 !text-yellow-400"}>
              NetBird-only services cannot bypass authentication.
            </HelpText>
          </div>
        )}
        {hasUnsupportedValue && (
          <div data-testid={"target-access-action-unsupported"}>
            <HelpText className={"mb-0 mt-1 !text-yellow-400"}>
              This value is not supported by this dashboard. It will be
              preserved unless you select a supported option.
            </HelpText>
          </div>
        )}
      </div>
      <SelectDropdown
        value={selectedValue}
        onChange={(next) => onChange(next as TargetAccessActionValue)}
        options={options}
        popoverWidth={260}
        className={"w-[260px]"}
        data-testid={"target-access-action"}
      />
    </div>
  );
}
