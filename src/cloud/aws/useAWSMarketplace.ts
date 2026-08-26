import { useEffect } from "react";

export const AWS_MARKETPLACE_LOCAL_STORAGE_KEY = "netbird-aws-marketplace";

/**
 * Store aws_user_id query into localStorage
 */
export function useAWSMarketplace() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const awsUserId = params.get("aws_user_id");

    if (awsUserId) {
      try {
        localStorage.setItem(AWS_MARKETPLACE_LOCAL_STORAGE_KEY, awsUserId);
      } catch (e) {}
    }
  }, []);
}
