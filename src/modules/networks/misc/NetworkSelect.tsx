import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { SmallBadge } from "@components/ui/SmallBadge";
import { NetworkIcon, PlusCircle } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

export type NetworkSelectOption = {
  value: string;
  name: string;
  description?: string;
  /** Marks a network created in this session with the NEW badge. */
  isNew?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: NetworkSelectOption[];
  /** Adds "New Network", pinned below the list. */
  onCreateNetwork?: () => void;
  maxHeight?: number;
  placeholder?: string;
  "data-testid"?: string;
};

const OptionIcon = ({ size }: { size?: number }) => <NetworkIcon size={size} />;

/** Picks the network something belongs to, with the option to create one. */
export const NetworkSelect = ({
  value,
  onChange,
  options,
  onCreateNetwork,
  maxHeight,
  placeholder = onCreateNetwork
    ? "Select or create network..."
    : "Select a network...",
  "data-testid": dataTestId,
}: Props) => {
  const selectOptions = useMemo<SelectOption[]>(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.isNew ? (
          <span className={"flex items-center gap-2"}>
            {option.name}
            <SmallBadge />
          </span>
        ) : (
          option.name
        ),
        icon: OptionIcon,
        searchValue: `${option.name} ${option.description ?? ""}`,
      })),
    [options],
  );

  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={selectOptions}
      showSearch={true}
      maxHeight={maxHeight}
      placeholder={placeholder}
      searchPlaceholder={"Search networks..."}
      data-testid={dataTestId}
      // Pinned below the options so scroll or search can't hide it.
      footerSeparator={false}
      footer={
        onCreateNetwork
          ? (close) => (
              <div className={"px-2 pb-2"}>
                <button
                  type={"button"}
                  className={
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-netbird hover:bg-nb-gray-800/60 w-full transition-colors"
                  }
                  data-testid={"create-network-option"}
                  onClick={() => {
                    close();
                    onCreateNetwork();
                  }}
                >
                  <PlusCircle size={14} />
                  New Network
                </button>
              </div>
            )
          : undefined
      }
    />
  );
};
