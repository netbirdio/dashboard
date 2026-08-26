"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "netbird-experiments";

interface ExperimentStorage {
  [experimentId: string]: string;
}

function getStoredExperiments(): ExperimentStorage {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storeExperiment(experimentId: string, variant: string): void {
  if (typeof window === "undefined") return;

  try {
    const experiments = getStoredExperiments();
    experiments[experimentId] = variant;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
  } catch {
    // Silently fail if localStorage is not available
  }
}

function selectRandomVariant(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

export function useExperiment<T extends Record<string, any>>(
  experimentId: string,
  variants: T,
): [T[keyof T], string] {
  const [selectedVariant, setSelectedVariant] = useState<T[keyof T] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("");

  const variantKeys = Object.keys(variants);
  const variantKeysString = variantKeys.join(",");

  useEffect(() => {
    if (!experimentId || variantKeys.length === 0) {
      setSelectedVariant(null);
      setSelectedKey("");
      return;
    }

    const storedExperiments = getStoredExperiments();
    const existingVariant = storedExperiments[experimentId];

    if (existingVariant && existingVariant in variants) {
      setSelectedVariant(variants[existingVariant]);
      setSelectedKey(existingVariant);
      return;
    }

    const randomKey = selectRandomVariant(variantKeys);
    storeExperiment(experimentId, randomKey);
    setSelectedVariant(variants[randomKey]);
    setSelectedKey(randomKey);
  }, [experimentId, variantKeysString]);

  const defaultKey = variantKeys[0] || "";
  return [
    selectedVariant || (defaultKey ? variants[defaultKey] : null),
    selectedKey || defaultKey,
  ];
}
