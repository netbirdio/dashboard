"use client";

import { cn } from "@utils/helpers";
import React, {
  ClipboardEvent,
  forwardRef,
  KeyboardEvent,
  useImperativeHandle,
  useRef,
} from "react";

export interface PinCodeInputRef {
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
  type?: "text" | "password";
}

const PinCodeInput = forwardRef<PinCodeInputRef, Props>(function PinCodeInput(
  { value, onChange, length = 6, disabled = false, className, type = "text" },
  ref,
) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRefs.current[0]?.focus();
    },
  }));

  const digits = value
    .split("")
    .concat(Array(length).fill(""))
    .slice(0, length);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return;

    const newDigits = [...digits];
    newDigits[index] = digit.slice(-1);
    const newValue = newDigits.join("").replace(/\s/g, "");
    onChange(newValue);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (/^\d$/.test(e.key) && digits[index]) {
      e.preventDefault();
      const newDigits = [...digits];
      newDigits[index] = e.key;
      onChange(newDigits.join("").replace(/\s/g, ""));
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pastedData);

    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type={type}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          disabled={disabled}
          className={cn(
            "w-[42px] h-[42px] text-center text-sm rounded-md",
            "dark:bg-nb-gray-900 border dark:border-nb-gray-700",
            "dark:placeholder:text-neutral-400/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "ring-offset-neutral-200/20 dark:ring-offset-neutral-950/50 dark:focus-visible:ring-neutral-500/20",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        />
      ))}
    </div>
  );
});

export default PinCodeInput;
