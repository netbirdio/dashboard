"use client";

import { useEffect } from "react";

export const DisableDarkReader = () => {
  useEffect(() => {
    try {
      const lock = document.createElement("meta");
      lock.name = "darkreader-lock";
      document.head.appendChild(lock);
    } catch (e) {}
  }, []);

  return null;
};
