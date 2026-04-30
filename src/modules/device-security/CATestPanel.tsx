"use client";

import { CheckCircle, ChevronDown, ChevronUp, MinusCircle, XCircle } from "lucide-react";
import React, { useState } from "react";
import type { CATestResult, CATestStep } from "@/interfaces/DeviceSecurity";

const STEP_LABELS: Record<string, string> = {
  generate_csr: "Generate CSR",
  sign_certificate: "Sign Certificate",
  verify_certificate: "Verify Certificate",
  revoke_certificate: "Revoke Certificate",
  verify_crl: "Verify CRL",
};

function StepRow({ step }: { step: CATestStep }) {
  const [expanded, setExpanded] = useState(step.status === "error");
  const hasDetails = Boolean(step.detail || step.fix_hint);

  const icon =
    step.status === "ok" ? (
      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
    ) : step.status === "error" ? (
      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
    ) : (
      <MinusCircle className="h-4 w-4 shrink-0 text-gray-400" />
    );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{STEP_LABELS[step.name] ?? step.name}</span>
          {step.elapsed_ms > 0 && (
            <span className="text-xs text-gray-400">{step.elapsed_ms}ms</span>
          )}
        </div>
        {hasDetails && (
          <button
            type="button"
            aria-label={expanded ? `Hide ${STEP_LABELS[step.name] ?? step.name} details` : `Show ${STEP_LABELS[step.name] ?? step.name} details`}
            onClick={() => setExpanded((e) => !e)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>
      {expanded && step.detail && (
        <p className="ml-6 text-xs text-gray-500 dark:text-gray-400">{step.detail}</p>
      )}
      {expanded && step.fix_hint && (
        <div className="ml-6 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          <span className="font-medium">How to fix: </span>
          {step.fix_hint}
        </div>
      )}
    </div>
  );
}

export function CATestPanel({ result }: { result: CATestResult }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 ${
        result.success
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          result.success
            ? "text-green-700 dark:text-green-300"
            : "text-red-700 dark:text-red-300"
        }`}
      >
        {result.success ? "All tests passed" : "Test failed"}
      </p>
      <div className="flex flex-col gap-2">
        {result.steps.map((step) => (
          <StepRow key={step.name} step={step} />
        ))}
      </div>
    </div>
  );
}
