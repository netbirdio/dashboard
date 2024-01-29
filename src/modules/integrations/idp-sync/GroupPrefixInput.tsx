import Button from "@components/Button";
import { Input } from "@components/Input";
import { useDebounce } from "@hooks/useDebounce";
import { Folder, MinusCircleIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";

type GroupPrefixInputProps = {
  value: string[];
  onChange: (values: string[]) => void;
  addText?: string;
  icon?: React.ReactNode;
  text?: string;
  placeholder?: string;
};

export function GroupPrefixInput({
  value,
  onChange,
  addText = "Add group filter",
  icon = <Folder size={14} />,
  text = "Group starts with...",
  placeholder = "e.g., NetBird_",
}: GroupPrefixInputProps) {
  const [groupPrefixes, setGroupPrefixes] = useState<string[]>(value);
  const prefixes = useDebounce(groupPrefixes, 100);

  useEffect(() => {
    onChange(prefixes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefixes]);

  const onChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const newPrefixes = [...groupPrefixes];
    newPrefixes[index] = e.target.value;
    setGroupPrefixes(newPrefixes);
  };

  const onRemoveGroupPrefix = (index: number) => {
    setGroupPrefixes((p) => {
      const newPrefixes = [...p];
      newPrefixes.splice(index, 1);
      return newPrefixes;
    });
  };

  const onAddGroupPrefix = () => {
    setGroupPrefixes((p) => {
      const newPrefixes = [...p];
      newPrefixes.push("");
      return newPrefixes;
    });
  };

  return (
    <div className={"mt-4"}>
      {groupPrefixes.length > 0 && (
        <div className={"flex gap-3 w-full mb-3"}>
          <div className={"flex flex-col gap-2 w-full"}>
            {groupPrefixes.map((g, i) => {
              return (
                <div className={"flex gap-2 w-full"} key={i}>
                  <div className={"w-full"}>
                    <Input
                      customPrefix={
                        <div className={"flex gap-2 items-center"}>
                          {icon}
                          <span>{text}</span>
                        </div>
                      }
                      placeholder={placeholder}
                      maxWidthClass={"w-full"}
                      value={g}
                      className={" !text-[13px]"}
                      onKeyDown={(event) => {
                        if (event.code === "Space") event.preventDefault();
                      }}
                      onChange={(e) => onChangeHandler(e, i)}
                    />
                  </div>
                  <Button
                    className={"h-[42px]"}
                    variant={"default-outline"}
                    onClick={() => onRemoveGroupPrefix(i)}
                  >
                    <MinusCircleIcon size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Button
        variant={"dotted"}
        className={"w-full"}
        size={"sm"}
        onClick={onAddGroupPrefix}
      >
        <PlusIcon size={14} />
        {addText}
      </Button>
    </div>
  );
}
