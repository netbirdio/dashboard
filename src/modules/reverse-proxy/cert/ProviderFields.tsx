"use client";

import { Input } from "@components/Input";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import * as React from "react";

import { ProviderSchema } from "./providers";

type Props = {
  schema: ProviderSchema;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  // When editing an existing service whose credential the dashboard
  // can't read back, we display masked placeholders for masked fields.
  // Any user input replaces the existing credential wholesale.
  editingExisting: boolean;
};

export function ProviderFields({ schema, values, onChange, editingExisting }: Props) {
  return (
    <div className={"flex flex-col gap-4"}>
      {schema.fields.map((field) => {
        const value = values[field.key] ?? "";
        const placeholderForMasked =
          editingExisting && field.masked && value === ""
            ? "•••••••• (leave blank to keep current; type to replace)"
            : field.placeholder;
        return (
          <div key={field.key} className={"flex flex-col gap-2"}>
            <Label htmlFor={`provider-field-${field.key}`}>
              {field.label}
              {!field.required && (
                <span className={"text-nb-gray-400 ml-1 text-xs font-normal"}>
                  optional
                </span>
              )}
            </Label>
            <Input
              id={`provider-field-${field.key}`}
              type={field.masked ? "password" : "text"}
              showPasswordToggle={field.masked}
              value={value}
              placeholder={placeholderForMasked}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
            {field.helper && (
              <Paragraph className={"text-xs !text-nb-gray-400"}>
                {field.helper}
              </Paragraph>
            )}
          </div>
        );
      })}
    </div>
  );
}
