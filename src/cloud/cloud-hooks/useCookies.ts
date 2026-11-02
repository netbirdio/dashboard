//@ts-nocheck
"use client";
import Cookies from "js-cookie";
import { useCallback, useEffect, useState } from "react";

type UseCookieReturn<T> = [
  T | null,
  (newValue: T, options?: unknown) => void,
  () => void,
];

async function getCookie(cookieName: string): Promise<string | null> {
  if ("cookieStore" in window) {
    return (await cookieStore.get(cookieName))?.value ?? null;
  }

  return Cookies.get(cookieName) ?? null;
}

async function setCookie(
  cookieName: string,
  value: string,
  options?: unknown,
): Promise<void> {
  if ("cookieStore" in window) {
    return cookieStore.set(cookieName, value, options);
  }

  Cookies.set(cookieName, value, options as CookieAttributes);
}

async function deleteCookie(cookie: string): Promise<void> {
  if ("cookieStore" in window) {
    return cookieStore.delete(cookie);
  }

  Cookies.remove(cookie);
}

export function listenForCookieChange(
  cookieName: string,
  onChange: (newValue: string | null) => void,
): () => void {
  if ("cookieStore" in window) {
    const changeListener = (event) => {
      const foundCookie = event.changed.find(
        (cookie) => cookie.name === cookieName,
      );
      if (foundCookie) {
        onChange(foundCookie.value);
        return;
      }

      const deletedCookie = event.deleted.find(
        (cookie) => cookie.name === cookieName,
      );
      if (deletedCookie) {
        onChange(null);
      }
    };

    cookieStore.addEventListener("change", changeListener);

    return () => {
      cookieStore.removeEventListener("change", changeListener);
    };
  }

  const interval = setInterval(() => {
    const cookie = Cookies.get(cookieName);
    if (cookie) {
      onChange(cookie);
    } else {
      onChange(null);
    }
  }, 1000);

  return () => {
    clearInterval(interval);
  };
}

export default function useCookieWithListener<T>(
  name: string,
  defaultValue: T,
): UseCookieReturn<T> {
  const [value, setValue] = useState<T | null>(defaultValue);

  useEffect(() => {
    getCookie(name).then((cookie) => {
      if (cookie) {
        try {
          setValue(JSON.parse(cookie));
        } catch (err) {
          setValue(cookie as T);
        }
      }
    });

    return listenForCookieChange(name, (newValue) => {
      try {
        setValue(newValue ? JSON.parse(newValue) : null);
      } catch (err) {
        setValue(newValue as T);
      }
    });
  }, [name]);

  const updateCookie = useCallback(
    (newValue: T, options?: unknown) => {
      setCookie(name, JSON.stringify(newValue), options);
    },
    [name],
  );

  const _deleteCookie = useCallback(() => {
    deleteCookie(name);
  }, [name]);

  return [value, updateCookie, _deleteCookie];
}
