import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import Button from "@components/Button";
import { Input } from "@components/Input";
import { uniqueId } from "lodash";
import { MinusCircleIcon } from "lucide-react";

export interface ConfigHeader {
  key: string;
  value: string;
  id: string;
  error?: string;
}

export enum ActionType {
  ADD = "ADD",
  REMOVE = "REMOVE",
  UPDATE = "UPDATE",
  SET_ALL = "SET_ALL",
}

type AddAction = { type: ActionType.ADD };
type RemoveAction = { type: ActionType.REMOVE; index: number };
type UpdateAction = {
  type: ActionType.UPDATE;
  index: number;
  header: ConfigHeader;
};
type SetAllAction = { type: ActionType.SET_ALL; headers: ConfigHeader[] };

export type HeaderAction =
  | AddAction
  | RemoveAction
  | UpdateAction
  | SetAllAction;

export function httpHeadersReducer(
  state: ConfigHeader[],
  action: HeaderAction,
): ConfigHeader[] {
  switch (action.type) {
    case ActionType.ADD:
      return [
        ...state,
        { key: "", value: "", id: uniqueId("header"), error: "" },
      ];
    case ActionType.REMOVE:
      return state.filter((_, i) => i !== action.index);
    case ActionType.UPDATE:
      return state.map((h, i) => (i === action.index ? action.header : h));
    case ActionType.SET_ALL:
      return action.headers;
    default:
      return state;
  }
}

export function HeadersInput({
  value,
  onChange,
  onRemove,
  onError,
  disabled,
}: Readonly<{
  value: ConfigHeader;
  onChange: (header: ConfigHeader) => void;
  onRemove: () => void;
  onError?: (error: boolean) => void;
  disabled?: boolean;
}>) {
  const [key, setKey] = useState(value.key);
  const [headerValue, setHeaderValue] = useState(value.value);

  const t = useTranslations("webhooks");

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setKey(newKey);

    let error = "";
    if (newKey === "" && headerValue !== "") {
      error = t("headerKeyRequired");
    }

    onChange({ ...value, key: newKey, error });
    onError?.(!!error);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setHeaderValue(newValue);

    let error = "";
    if (key === "" && newValue !== "") {
      error = t("headerNameRequired");
    }

    onChange({ ...value, value: newValue, error });
    onError?.(!!error);
  };

  useEffect(() => {
    let error = "";
    if (key === "" && headerValue !== "") {
      error = t("headerNameRequired");
      onError?.(true);
    } else {
      onError?.(false);
    }
    if (value.error !== error) onChange({ ...value, error });
    return () => onError?.(false);
  }, []);

  return (
    <div className={"flex flex-col w-full gap-1"}>
      <div className={"flex gap-2 w-full"}>
        <div className={"w-full"}>
          <Input
            customPrefix={t("headerName")}
            placeholder={t("headerNamePlaceholder")}
            maxWidthClass={"w-full"}
            value={key}
            error={value.error}
            errorTooltip={true}
            onChange={handleKeyChange}
            disabled={disabled}
            data-testid="webhook-header-name"
          />
        </div>

        <div className={"w-full"}>
          <Input
            customPrefix={t("headerValue")}
            placeholder={t("headerValuePlaceholder")}
            maxWidthClass={"w-full"}
            value={headerValue}
            onChange={handleValueChange}
            disabled={disabled}
            data-testid="webhook-header-value"
          />
        </div>

        <Button
          className={"h-[42px]"}
          variant={"default-outline"}
          onClick={onRemove}
          disabled={disabled}
          data-testid="webhook-header-remove"
        >
          <MinusCircleIcon size={15} />
        </Button>
      </div>
    </div>
  );
}
