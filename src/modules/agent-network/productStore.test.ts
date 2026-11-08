import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLastProduct,
  lastProductKey,
  resetLastProducts,
  setLastProduct,
  subscribeLastProduct,
} from "@/modules/agent-network/productStore";

describe("productStore", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetLastProducts();
  });
  afterEach(() => {
    localStorage.clear();
    resetLastProducts();
  });

  it("has no product before one is set", () => {
    expect(getLastProduct("u1")).toBeUndefined();
  });

  it("keeps the product in localStorage, so a new tab and a reload keep it", () => {
    setLastProduct("u1", "agent-network");
    expect(localStorage.getItem(lastProductKey("u1"))).toBe("agent-network");
    expect(sessionStorage.length).toBe(0);
    expect(getLastProduct("u1")).toBe("agent-network");
  });

  it("keeps one product per user", () => {
    setLastProduct("u1", "agent-network");
    setLastProduct("u2", "networking");
    expect(getLastProduct("u1")).toBe("agent-network");
    expect(getLastProduct("u2")).toBe("networking");
  });

  it("neither reads nor writes before the user is known", () => {
    setLastProduct(undefined, "agent-network");
    expect(localStorage.length).toBe(0);
    expect(getLastProduct(undefined)).toBeUndefined();
  });

  it("reads a value written to localStorage from outside", () => {
    localStorage.setItem(lastProductKey("u1"), "agent-network");
    expect(getLastProduct("u1")).toBe("agent-network");
  });

  it("ignores a stored value that is not a product", () => {
    localStorage.setItem(lastProductKey("u1"), "billing");
    expect(getLastProduct("u1")).toBeUndefined();
  });

  it("tells subscribers when the product changes, and only then", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLastProduct(listener);
    setLastProduct("u1", "agent-network");
    setLastProduct("u1", "agent-network");
    setLastProduct("u1", "networking");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setLastProduct("u1", "agent-network");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("forgets every user's product on reset, and nothing else", () => {
    localStorage.setItem("netbird-theme", "dark");
    setLastProduct("u1", "agent-network");
    setLastProduct("u2", "agent-network");
    resetLastProducts();
    expect(getLastProduct("u1")).toBeUndefined();
    expect(getLastProduct("u2")).toBeUndefined();
    expect(localStorage.getItem("netbird-theme")).toBe("dark");
  });
});
