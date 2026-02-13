import { createContext, useContext } from "react";
import { ReverseProxy } from "@/interfaces/ReverseProxy";

const ReverseProxyTargetContext = createContext<ReverseProxy | null>(null);

export const ReverseProxyTargetProvider = ReverseProxyTargetContext.Provider;

export const useReverseProxyTarget = () => {
  const context = useContext(ReverseProxyTargetContext);
  if (!context) {
    throw new Error(
      "useReverseProxyTarget must be used within a ReverseProxyTargetProvider",
    );
  }
  return context;
};
