"use client";

import { useOidc, useOidcAccessToken, useOidcIdToken } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import loadConfig from "@utils/config";
import { ArrowRightIcon, RefreshCw, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useI18n } from "@/i18n/I18nProvider";
import { isExpired } from "react-jwt";
import { sleep } from "@utils/helpers";

const config = loadConfig();

export default function ErrorPage() {
  const { t } = useI18n();
  const { logout, isAuthenticated } = useOidc();
  const { idToken } = useOidcIdToken();
  const { accessToken } = useOidcAccessToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<{
    code: number;
    message: string;
    type: string;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const tokenSource = config.tokenSource || "accessToken";
  const token = tokenSource.toLowerCase() == "idtoken" ? idToken : accessToken;

  const checkUserStatus = async () => {
    // 检查 token 是否过期
    let attempts = 4;
    while (isExpired(token) && attempts > 0) {
      await sleep(500);
      attempts = attempts - 1;
    }

    if (isExpired(token)) {
      return;
    }

    try {
      setIsCheckingStatus(true);
      const response = await fetch(`${config.apiOrigin}/api/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // 如果 API 成功返回，说明用户已经被批准，重定向到主页
        router.push("/");
      }
    } catch (e) {
      // API 调用失败，继续显示错误页面
      console.log("Failed to check user status:", e);
    } finally {
      setIsCheckingStatus(false);
    }
  };

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

  useEffect(() => {
    const isPendingApproval =
      error?.code === 403 &&
      error?.message?.toLowerCase().includes("pending approval");

    if (isPendingApproval && isAuthenticated) {
      // 立即检查一次状态
      checkUserStatus();

      // 每 5 秒检查一次用户状态
      const intervalId = setInterval(checkUserStatus, 5000);

      return () => clearInterval(intervalId);
    }
  }, [error, isAuthenticated, token]);

  const handleLogout = () => {
    // Use the same logout pattern as OIDCError
    logout("/", { client_id: config.clientId });
  };

  const handleRetry = () => {
    router.push("/");
  };

  const handleCheckStatus = () => {
    checkUserStatus();
  };

  if (!isAuthenticated) {
    // If not authenticated, redirect to home
    router.push("/");
    return null;
  }

  const isBlockedUser =
    error?.code === 403 && error?.message?.toLowerCase().includes("blocked");
  const isPendingApproval =
    error?.code === 403 &&
    error?.message?.toLowerCase().includes("pending approval");

  const getTitle = () => {
    if (isBlockedUser) return t("errorPage.blockedTitle");
    if (isPendingApproval) return t("errorPage.pendingTitle");
    return t("errorPage.defaultTitle");
  };

  const getDescription = () => {
    if (isBlockedUser) {
      return t("errorPage.blockedDescription");
    }
    if (isPendingApproval) {
      return t("errorPage.pendingDescription");
    }
    return t("errorPage.defaultDescription");
  };

  return (
    <div className="flex items-center justify-center flex-col h-screen max-w-xl mx-auto">
      <div className="bg-nb-gray-930 mb-3 border border-nb-gray-900 h-12 w-12 rounded-md flex items-center justify-center">
        <NetBirdIcon size={23} />
      </div>

      <h1 className="text-center mt-2">{getTitle()}</h1>

      <Paragraph className="text-center mt-2 block">
        {getDescription()}
      </Paragraph>

      {error && (
        <div className="bg-nb-gray-930 border border-nb-gray-800 rounded-md p-4 mt-4 max-w-md font-mono mb-2">
          <div className="text-center text-sm text-netbird">
            <div>
              {t("errorPage.responseMessage")}: {error.message}
            </div>
          </div>
        </div>
      )}

      <Paragraph className="text-center mt-2 text-sm">
        {t("errorPage.contactAdmin")}
      </Paragraph>

      <div className="mt-5 space-y-3">
        {isPendingApproval && (
          <Button variant="default-outline" size="sm" onClick={handleCheckStatus} disabled={isCheckingStatus}>
            {isCheckingStatus ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                检查状态中...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" />
                检查审批状态
              </>
            )}
          </Button>
        )}

        {!isBlockedUser && !isPendingApproval && (
          <Button variant="default-outline" size="sm" onClick={handleRetry}>
            <RefreshCw size={16} className="mr-2" />
            {t("errorPage.tryAgain")}
          </Button>
        )}

        <Button variant="primary" size="sm" onClick={handleLogout}>
          {isBlockedUser || isPendingApproval
            ? t("errorPage.signOut")
            : t("user.logout")}
          <ArrowRightIcon size={16} />
        </Button>
      </div>
    </div>
  );
}
