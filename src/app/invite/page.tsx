"use client";

import Button from "@components/Button";
import { Input } from "@components/Input";
import Paragraph from "@components/Paragraph";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { acceptInvite, fetchInviteInfo } from "@utils/unauthenticatedApi";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  KeyRound,
  Mail,
  User2,
} from "lucide-react";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useI18n } from "@/i18n/I18nProvider";
import { UserInviteInfo } from "@/interfaces/User";

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<FullScreenLoading />}>
      <InviteAcceptContent />
    </Suspense>
  );
}

function InviteAcceptContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  const [loading, setLoading] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<UserInviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("invite.acceptMissingToken"));
      setLoading(false);
      return;
    }

    fetchInviteInfo(token)
      .then((info) => {
        setInviteInfo(info);
        setLoading(false);
      })
      .catch((err) => {
        if (err.code === 429) {
          setError(t("invite.acceptRateLimited"));
          setIsRateLimited(true);
        } else {
          setError(err.message || t("invite.acceptInvalidLink"));
          setIsRateLimited(false);
        }
        setLoading(false);
      });
  }, [token, t]);

  const passwordsMatch = password === confirmPassword;
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const canSubmit = passwordValid && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token) return;

    setSubmitting(true);
    setError(null);

    try {
      await acceptInvite(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t("invite.acceptFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const isExpired = useMemo(() => {
    if (!inviteInfo) return false;
    return new Date(inviteInfo.expires_at) < new Date();
  }, [inviteInfo]);

  if (loading) {
    return <FullScreenLoading />;
  }

  if (error && !inviteInfo) {
    if (isRateLimited) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-nb-gray-950 p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              {t("invite.tooManyRequests")}
            </h1>
            <Paragraph className="text-nb-gray-400 text-base">
              {t("invite.tooManyRequestsDescription")}
            </Paragraph>
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => window.location.reload()}
            >
              {t("errorPage.tryAgain")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-nb-gray-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            {t("invite.invalidTitle")}
          </h1>
          <Paragraph className="text-nb-gray-400 text-base">
            {t("invite.invalidDescription")}
          </Paragraph>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => router.push("/")}
          >
            {t("invite.goToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nb-gray-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            {t("invite.accountCreatedTitle")}
          </h1>
          <Paragraph className="text-nb-gray-400">
            {t("invite.accountCreatedDescription")}
          </Paragraph>
          <Button
            variant="primary"
            className="mt-6"
            onClick={() => router.push("/")}
          >
            {t("invite.goToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  if (isExpired || !inviteInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nb-gray-950 p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            {t("invite.expiredTitle")}
          </h1>
          <Paragraph className="text-nb-gray-400">
            {t("invite.expiredDescription")}
          </Paragraph>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => router.push("/")}
          >
            {t("invite.goToLogin")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nb-gray-950 p-4">
      <div className="max-w-md w-full">
        <div className="mb-8 flex justify-center">
          <NetBirdIcon size={48} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">
            {t("invite.welcomeTitle")}
          </h1>
          <p className="dark:text-nb-gray-400 text-nb-gray-500 text-base">
            {t("invite.welcomeDescription", {
              invitedBy: inviteInfo.invited_by,
            })}
          </p>
        </div>

        <div className="bg-nb-gray-930 border border-nb-gray-900 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-nb-gray-900 rounded-full flex items-center justify-center">
              <User2 className="w-5 h-5 text-nb-gray-400" />
            </div>
            <div>
              <div className="text-white font-medium">{inviteInfo.name}</div>
              <div className="text-nb-gray-400 text-sm flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {inviteInfo.email}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder={t("invite.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                customPrefix={
                  <KeyRound size={16} className="text-nb-gray-400" />
                }
              />
              {password && (
                <div className="mt-2 space-y-1">
                  <PasswordRule
                    met={hasMinLength}
                    text={t("invite.passwordRuleMinLength")}
                  />
                  <PasswordRule
                    met={hasUppercase}
                    text={t("invite.passwordRuleUppercase")}
                  />
                  <PasswordRule
                    met={hasLowercase}
                    text={t("invite.passwordRuleLowercase")}
                  />
                  <PasswordRule
                    met={hasNumber}
                    text={t("invite.passwordRuleNumber")}
                  />
                  <PasswordRule
                    met={hasSpecialChar}
                    text={t("invite.passwordRuleSpecial")}
                  />
                </div>
              )}
            </div>

            <div>
              <Input
                type="password"
                placeholder={t("invite.confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                customPrefix={
                  <KeyRound size={16} className="text-nb-gray-400" />
                }
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">
                  {t("changePassword.passwordMatchError")}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!canSubmit}
            >
              {submitting
                ? t("invite.creatingAccount")
                : t("invite.createAccount")}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-nb-gray-500">
          {t("invite.expiresOn")}{" "}
          {dayjs(inviteInfo.expires_at).format(
            t("invite.acceptExpiresOnFormat"),
          )}
        </p>
      </div>
    </div>
  );
}

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="w-3 h-3 text-green-500" />
      ) : (
        <AlertCircle className="w-3 h-3 text-nb-gray-500" />
      )}
      <span className={met ? "text-green-500" : "text-nb-gray-500"}>{text}</span>
    </div>
  );
}
