import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentProduct,
  PRODUCT_STORAGE_KEY,
  resetCurrentProduct,
  setCurrentProduct,
  subscribeCurrentProduct,
} from "@/modules/agent-network/productStore";

describe("productStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetCurrentProduct();
  });
  afterEach(() => {
    sessionStorage.clear();
    resetCurrentProduct();
  });

  it("has no product before one is set", () => {
    expect(getCurrentProduct()).toBeUndefined();
  });

  it("keeps the product in sessionStorage, so a reload keeps it", () => {
    setCurrentProduct("agent-network");
    expect(sessionStorage.getItem(PRODUCT_STORAGE_KEY)).toBe("agent-network");
    expect(getCurrentProduct()).toBe("agent-network");
  });

  it("reads a value written to sessionStorage from outside", () => {
    sessionStorage.setItem(PRODUCT_STORAGE_KEY, "agent-network");
    expect(getCurrentProduct()).toBe("agent-network");
  });

  it("ignores a stored value that is not a product", () => {
    sessionStorage.setItem(PRODUCT_STORAGE_KEY, "billing");
    expect(getCurrentProduct()).toBeUndefined();
  });

  it("tells subscribers when the product changes, and only then", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCurrentProduct(listener);
    setCurrentProduct("agent-network");
    setCurrentProduct("agent-network");
    setCurrentProduct("networking");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setCurrentProduct("agent-network");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
