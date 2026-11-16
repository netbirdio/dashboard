"use client";

import React from "react";

export function AssistantErrorNotice({
  error,
}: Readonly<{ error: string | null }>) {
  if (!error) return null;

  return (
    <div role="alert" className="mb-6 mt-1.5 flex">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-bl-sm bg-red-950/80 border border-red-900/70 px-3 py-2 text-sm text-red-200/90">
        {error}
      </div>
    </div>
  );
}
