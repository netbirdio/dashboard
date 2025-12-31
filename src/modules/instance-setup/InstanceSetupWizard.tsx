"use client";

import { cn } from "@utils/helpers";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { ApiError, SetupRequest } from "@/interfaces/Instance";
import { submitSetup } from "@/utils/unauthenticatedApi";
import { NetBirdLogo } from "@components/NetBirdLogo";
import Button from "@components/Button";
import { Label } from "@components/Label";
import { Input } from "@components/Input";
import HelpText from "@components/HelpText";
import { GradientFadedBackground } from "@components/ui/GradientFadedBackground";

interface FormData {
  email: string;
  password: string;
  name: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
  general?: string;
}

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/i;

export default function InstanceSetupWizard() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const request: SetupRequest = {
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
      };

      await submitSetup(request);
      setIsSuccess(true);
    } catch (err) {
      const error = err as ApiError;
      let message = "An error occurred. Please try again.";

      switch (error.code) {
        case 400:
          message = "Invalid request. Please check your input.";
          break;
        case 412:
          message = "Setup has already been completed. Redirecting to login...";
          setTimeout(() => (window.location.href = "/"), 2000);
          break;
        case 422:
          message =
            error.message || "Validation error. Please check your input.";
          break;
        case 500:
          message = "An error occurred. Please try again.";
          break;
        default:
          message = error.message || message;
      }

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isSuccess) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Full page reload to get fresh instance status from API
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess]);

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  if (isSuccess) {
    return (
      <div className="mt-20">
        <div className={"flex items-center justify-center"}>
          <NetBirdLogo size={"large"} mobile={false} />
        </div>
        <Card className={"max-w-[360px] mt-8 mx-auto"}>
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-4 mx-auto">
            <CheckCircle2 className="text-green-500" size={22} />
          </div>
          <h1 className={"text-xl text-center z-10 relative"}>
            Account Created!
          </h1>
          <div
            className={
              "text-sm text-nb-gray-300 font-light mt-2 block text-center z-10 relative"
            }
          >
            You are being redirected to login in{" "}
            <span className={"text-white font-medium"}>{countdown}s</span>...
          </div>
          <div className={"flex items-center justify-center mt-4"}>
            <Button
              type="button"
              onClick={() => (window.location.href = "/")}
              variant={"primary"}
              className={"mx-auto w-full"}
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-20">
      <div className={"flex items-center justify-center"}>
        <NetBirdLogo size={"large"} mobile={false} />
      </div>
      <Card className={"max-w-[420px] mt-8 mx-auto"}>
        <h1 className={"text-xl text-center z-10 relative"}>
          Welcome to NetBird
        </h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center z-10 relative"
          }
        >
          Create the first admin account to get started
        </div>

        <form
          onSubmit={handleSubmit}
          className={"flex flex-col gap-5 mt-7 z-10 relative"}
        >
          {errors.general && <ErrorMessage error={errors.general} />}
          <div>
            <Label htmlFor={"name"}>Name</Label>
            <Input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleInputChange("name")}
              placeholder="Your name"
              disabled={isSubmitting}
              autoFocus
              error={errors.name}
            />
          </div>

          <div>
            <Label htmlFor={"email"}>Email</Label>
            <Input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              placeholder="admin@example.com"
              disabled={isSubmitting}
              error={errors.email}
            />
          </div>

          <div>
            <Label htmlFor={"password"}>Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              value={formData.password}
              onChange={handleInputChange("password")}
              placeholder="Enter a strong password"
              disabled={isSubmitting}
              error={errors.password}
              customSuffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className={"hover:text-white transition-all"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <HelpText className={"mt-2"}>
              Must be at least 8 characters
            </HelpText>
          </div>

          <Button
            type={"submit"}
            disabled={isSubmitting}
            variant={"primary"}
            className={"w-full"}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Creating Account...
              </>
            ) : (
              "Create Admin Account"
            )}
          </Button>
        </form>
      </Card>

      <div className={"flex items-center justify-center mt-6"}>
        <span
          className={"text-sm text-nb-gray-400 font-light pb-10 text-center"}
        >
          This is a one-time setup for your NetBird instance.
        </span>
      </div>
    </div>
  );
}

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "px-6 sm:px-10 py-8 pt-6",
        "bg-nb-gray-940 border border-nb-gray-910  rounded-lg   relative",
        className,
      )}
    >
      <GradientFadedBackground />
      {children}
    </div>
  );
};

const ErrorMessage = ({ error }: { error?: string }) => {
  return (
    <div className="text-red-400 bg-red-800/20 border border-red-800/50 rounded-lg px-4 py-3 whitespace-break-spaces my-3 text-sm">
      {error}
    </div>
  );
};
