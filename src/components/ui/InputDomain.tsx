import Button from "@components/Button";
import { Input } from "@components/Input";
import { validator } from "@utils/helpers";
import { uniqueId } from "lodash";
import { GlobeIcon, MinusCircleIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Domain } from "@/interfaces/Domain";

type Props = {
  value: Domain;
  onChange: (d: Domain) => void;
  onRemove: () => void;
  onError?: (error: boolean) => void;
  error?: string;
  disabled?: boolean;
  preventLeadingAndTrailingDots?: boolean;
  allowWildcard?: boolean;
};
enum ActionType {
  ADD = "ADD",
  REMOVE = "REMOVE",
  UPDATE = "UPDATE",
}

export const domainReducer = (state: Domain[], action: any): Domain[] => {
  switch (action.type) {
    case ActionType.ADD:
      return [...state, { name: "", id: uniqueId("domain") }];
    case ActionType.REMOVE:
      return state.filter((_, i) => i !== action.index);
    case ActionType.UPDATE:
      return state.map((n, i) => (i === action.index ? action.d : n));
    default:
      return state;
  }
};

export default function InputDomain({
  value,
  onChange,
  onRemove,
  onError,
  disabled,
  preventLeadingAndTrailingDots,
  allowWildcard = true,
}: Readonly<Props>) {
  const [name, setName] = useState(value?.name || "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    onChange({ ...value, name: e.target.value });
  };

  const domainError = useMemo(() => {
    if (name == "") {
      return "";
    }
    const valid = validator.isValidDomain(name, {
      allowOnlyTld: true,
      allowWildcard,
      preventLeadingAndTrailingDots,
    });
    if (!valid) {
      return "Please enter a valid domain, e.g. example.com or intra.example.com";
    }
  }, [name]);

  useEffect(() => {
    const hasError = domainError !== "" && domainError !== undefined;
    onError?.(hasError);
    return () => onError?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainError]);

  return (
    <div className={"flex gap-2 w-full"}>
      <div className={"w-full"}>
        <Input
          customPrefix={<GlobeIcon size={15} />}
          placeholder={"e.g., example.com"}
          maxWidthClass={"w-full"}
          data-cy={"domain-input"}
          value={name}
          error={domainError}
          onChange={handleNameChange}
          disabled={disabled}
        />
      </div>

      <Button
        className={"h-[42px]"}
        variant={"default-outline"}
        onClick={onRemove}
        disabled={disabled}
      >
        <MinusCircleIcon size={15} />
      </Button>
    </div>
  );
}
