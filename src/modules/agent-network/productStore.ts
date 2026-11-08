import { isProduct, type Product } from "@/modules/agent-network/product";

/**
 * The product a user was last in, kept per user in localStorage. It is only
 * a default: the URL names the product of every page (see product.ts), and
 * this answers only for a shared page opened without `?product=`, such as an
 * old bookmark or a link from the docs. There is no server setting for it
 * yet; when there is, this is the one place to swap.
 */
export const LAST_PRODUCT_KEY = "netbird-last-product";

/** One key per user, so people sharing a browser don't share the default. */
export const lastProductKey = (userId: string) =>
  `${LAST_PRODUCT_KEY}:${userId}`;

// Only used where localStorage throws (blocked storage, private modes).
const memory = new Map<string, Product>();
const listeners = new Set<() => void>();

/** Read from localStorage every time, so a value written elsewhere counts. */
export const getLastProduct = (userId?: string): Product | undefined => {
  if (!userId) return undefined;
  try {
    const value = localStorage.getItem(lastProductKey(userId));
    return isProduct(value) ? value : undefined;
  } catch {
    return memory.get(userId);
  }
};

export const setLastProduct = (userId: string | undefined, product: Product) => {
  if (!userId || getLastProduct(userId) === product) return;
  memory.set(userId, product);
  try {
    localStorage.setItem(lastProductKey(userId), product);
  } catch {}
  listeners.forEach((listener) => listener());
};

export const subscribeLastProduct = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Forgets every user's product; for tests. */
export const resetLastProducts = () => {
  memory.clear();
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${LAST_PRODUCT_KEY}:`))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
};
