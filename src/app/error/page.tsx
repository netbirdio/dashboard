"use client";

import { useOidc } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import loadConfig from "@utils/config";
import { ArrowRightIcon, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";

const config = loadConfig();

export default function ErrorPage() {
  const { logout, isAuthenticated } = useOidc();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<{
    code: number;
    message: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    // Get error details from URL params
    const code = searchParams.get("code");
    const message = searchParams.get("message");
    const type = searchParams.get("type");

    if (code && message) {
      setError({
        code: parseInt(code),
        message: decodeURIComponent(message),
        type: type || "error",
      });
    }
  }, [searchParams]);

  const handleLogout = () => {
    // Use the same logout pattern as OIDCError
    logout("/", { client_id: config.clientId });
  };

  const handleRetry = () => {
    router.push("/");
  };

  if (!isAuthenticated) {
    // If not authenticated, redirect to home
    router.push("/");
    return null;
  }

  const isBlockedUser = error?.code === 403 && error?.message?.toLowerCase().includes("blocked");
  const isPendingApproval = error?.code === 403 && error?.message?.toLowerCase().includes("pending");

  const getTitle = () => {
    if (isBlockedUser) return "User Account Blocked";
    if (isPendingApproval) return "User Approval Pending";
    return "Access Error";
  };

  const getDescription = () => {
    if (isBlockedUser) {
      return "Your account has been blocked by an administrator. You cannot access the dashboard at this time.";
    }
    if (isPendingApproval) {
      return "Your account is pending approval from an administrator. Please wait for approval before accessing the dashboard.";
    }
    return "An error occurred while trying to access the dashboard. Please try again or contact your administrator.";
  };

  return (
    <div className="flex items-center justify-center flex-col h-screen max-w-lg mx-auto">
      <div className="bg-nb-gray-930 mb-3 border border-nb-gray-900 h-12 w-12 rounded-md flex items-center justify-center">
        <NetBirdIcon size={23} />
      </div>
      
      <h1 className="text-center mt-2">{getTitle()}</h1>

      <Paragraph className="text-center mt-2 block">
        {getDescription()}
      </Paragraph>

      {error && (
        <Paragraph className="text-center mt-4 block">
          Error: <span className="inline capitalize">{error.message}</span>
          {error.code && <span className="block text-sm text-nb-gray-400 mt-1">Code: {error.code}</span>}
        </Paragraph>
      )}

      <Paragraph className="text-center mt-2 text-sm">
        If you believe this is an error, please contact your administrator.
      </Paragraph>

      <div className="mt-5 space-y-3">
        {!isBlockedUser && !isPendingApproval && (
          <Button 
            variant="default-outline"
            size="sm"
            onClick={handleRetry}
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
        )}
        
        <Button 
          variant="primary"
          size="sm"
          onClick={handleLogout}
        >
          {isBlockedUser || isPendingApproval ? "Sign Out" : "Logout"}
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
}