"use client";

import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  hasExisting?: boolean;
  onChange: (value: string) => void;
}

export function PasswordField({ id, label, value, hasExisting, onChange }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          placeholder={hasExisting && !value ? "••••••••" : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
