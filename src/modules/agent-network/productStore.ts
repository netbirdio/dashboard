import type { Product } from "@/modules/agent-network/product";

/**
 * The product the caller is in, for the pages both products show. Kept per
 * tab in sessionStorage, so a reload stays in the same product and another
 * tab can be in the other one.
 */
export const PRODUCT_STORAGE_KEY = "netbird-product";

const isProduct = (value: unknown): value is Product =>
  value === "networking" || value === "agent-network";

// Only used where sessionStorage throws (blocked storage, private modes).
let memory: Product | undefined;
const listeners = new Set<() => void>();

/** Read from sessionStorage every time, so a value set from outside counts. */
export const getCurrentProduct = (): Product | undefined => {
  try {
    const value = sessionStorage.getItem(PRODUCT_STORAGE_KEY);
    return isProduct(value) ? value : undefined;
  } catch {
    return memory;
  }
};

export const setCurrentProduct = (product: Product) => {
  if (getCurrentProduct() === product) return;
  memory = product;
  try {
    sessionStorage.setItem(PRODUCT_STORAGE_KEY, product);
  } catch {}
  listeners.forEach((listener) => listener());
};

export const subscribeCurrentProduct = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Forgets the product; for tests. */
export const resetCurrentProduct = () => {
  memory = undefined;
  try {
    sessionStorage.removeItem(PRODUCT_STORAGE_KEY);
  } catch {}
};
