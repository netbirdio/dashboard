"use client";

import { Input } from "@components/Input";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

// TextInputPicker — single-value free-text filter. Use for columns
// where the user types a token (e.g. a port number) and the table
// matches via the column's filterFn (typically `includesString`).
type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  close: () => void;
  placeholder?: string;
};

export function TextInputPicker({ value, onChange, placeholder }: Props) {
  // Mirror the current filter value in a local input state so the
  // input stays controlled while the user types. Apply downstream
  // immediately so the table updates as they type.
  const [local, setLocal] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  const apply = (next: string) => {
    setLocal(next);
    onChange(next.trim() === "" ? undefined : next.trim());
  };

  return (
    <div className={"p-1"}>
      <Input
        ref={ref}
        value={local}
        onChange={(e) => apply(e.target.value)}
        placeholder={placeholder}
        maxWidthClass={"w-full"}
      />
    </div>
  );
}

// formatChip returns the typed value if any, otherwise null.
export function formatTextChip(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}
